/**
 * Integration tests against a real Postgres.
 * They run only when TEST_DATABASE_URL is set; `npx vitest run` stays green without it.
 *
 *   TEST_DATABASE_URL='postgresql://...' npx vitest run
 */
import { neon, NeonDbError } from "@neondatabase/serverless";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { SecurityError, SESSION_REQUIRED, NOT_FOUND } from "@/lib/security/errors";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

const state = vi.hoisted(() => ({
  context: null as null | {
    subjectId: string;
    sessionId: string;
    agencyId: string;
    role: "owner" | "staff";
  },
  useRealResolver: false,
}));

vi.mock("@/lib/security/context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security/context")>(
    "@/lib/security/context",
  );
  const { SecurityError } = await import("@/lib/security/errors");
  return {
    ...actual,
    resolveTenantContext: async () => {
      if (state.useRealResolver) {
        return actual.resolveTenantContext();
      }
      if (!state.context) {
        throw new SecurityError("unauthenticated", "Sessão ausente.");
      }
      return actual.createTestTenantContext(state.context);
    },
  };
});

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim() ?? "";
const enabled = Boolean(testDatabaseUrl);

type AgencyFixture = {
  userId: string;
  agencyId: string;
  email: string;
  excursionId: string;
  boardingPointId: string;
  passengerId: string;
  seatId: string;
};

describe.skipIf(!enabled)("integração multi-tenant (Postgres)", () => {
  const sql = enabled ? neon(testDatabaseUrl) : (null as unknown as ReturnType<typeof neon>);

  let agencyA: AgencyFixture;
  let agencyB: AgencyFixture;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.BETTER_AUTH_SECRET =
      process.env.TEST_BETTER_AUTH_SECRET?.trim() ||
      "integration-only-secret-do-not-use-in-prod-32";
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    await resetDatabase();
  }, 60_000);

  afterAll(async () => {
    if (enabled) {
      await resetDatabase();
    }
    delete process.env.DATABASE_URL;
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.BETTER_AUTH_URL;
  }, 60_000);

  beforeEach(() => {
    state.context = null;
    state.useRealResolver = false;
  });

  async function resetDatabase() {
    await sql`
      truncate table
        room_assignments,
        rooms,
        installments,
        seats,
        passengers,
        boarding_points,
        excursions,
        agency_memberships,
        agencies,
        "session",
        "account",
        "verification",
        "user"
      restart identity cascade
    `;
  }

  function asAgency(row: {
    userId: string;
    agencyId: string;
    email: string;
  }): AgencyFixture {
    return {
      ...row,
      excursionId: "",
      boardingPointId: "",
      passengerId: "",
      seatId: "",
    };
  }

  function actAs(agency: AgencyFixture) {
    state.useRealResolver = false;
    state.context = {
      subjectId: agency.userId,
      sessionId: crypto.randomUUID(),
      agencyId: agency.agencyId,
      role: "owner",
    };
  }

  test("cadastro cria usuário, agência e vínculo owner com trial de 14 dias", { timeout: 60_000 }, async () => {
    const { getAuth } = await import("@/lib/auth/server");
    const { provisionOwnerAgency } = await import("@/lib/auth/provision");

    const created = await getAuth().api.signUpEmail({
      body: {
        name: "Ana Agência",
        email: "ana.agencia@example.com",
        password: "senha-segura-1",
      },
      headers: new Headers(),
    });
    expect(created.user.id).toBeTruthy();

    const provisioned = await provisionOwnerAgency({
      userId: created.user.id,
      agencyName: "Agência Ana",
    });

    const users = (await sql`
      select id, email, name from "user" where id = ${created.user.id}
    `) as Array<{ id: string; email: string; name: string }>;
    expect(users).toEqual([
      {
        id: created.user.id,
        email: "ana.agencia@example.com",
        name: "Ana Agência",
      },
    ]);

    const agencies = (await sql`
      select id, name, trial_ends_at from agencies where id = ${provisioned.agencyId}
    `) as Array<{ id: string; name: string; trial_ends_at: string | Date }>;
    expect(agencies).toHaveLength(1);
    expect(agencies[0].name).toBe("Agência Ana");
    const trial = new Date(agencies[0].trial_ends_at).getTime();
    const now = Date.now();
    expect(trial).toBeGreaterThan(now + 13 * 24 * 60 * 60 * 1000);
    expect(trial).toBeLessThan(now + 15 * 24 * 60 * 60 * 1000);

    const memberships = (await sql`
      select role, status from agency_memberships
      where agency_id = ${provisioned.agencyId} and user_id = ${created.user.id}
    `) as Array<{ role: string; status: string }>;
    expect(memberships).toEqual([{ role: "owner", status: "active" }]);
  });

  test("isolamento real: A não lê nem edita dados de B; IDs cruzados dão não encontrado", { timeout: 60_000 }, async () => {
    const { getAuth } = await import("@/lib/auth/server");
    const { provisionOwnerAgency } = await import("@/lib/auth/provision");
    const commands = await import("@/lib/services/commands");
    const queries = await import("@/lib/services/queries");

    async function signup(name: string, email: string, agencyName: string) {
      const created = await getAuth().api.signUpEmail({
        body: { name, email, password: "senha-segura-1" },
        headers: new Headers(),
      });
      const provisioned = await provisionOwnerAgency({
        userId: created.user.id,
        agencyName,
      });
      return asAgency({
        userId: created.user.id,
        agencyId: provisioned.agencyId,
        email,
      });
    }

    agencyA = await signup("Dona A", "dona.a@example.com", "Agência A");
    agencyB = await signup("Dona B", "dona.b@example.com", "Agência B");

    async function seed(agency: AgencyFixture, destination: string, passengerName: string) {
      actAs(agency);
      const createdTrip = await commands.createExcursion({
        destination,
        originCity: "São Paulo",
        departureDate: "2026-12-10",
        returnDate: "2026-12-12",
        capacity: "4",
        boarding: "Centro",
      });
      expect(createdTrip.ok, JSON.stringify(createdTrip)).toBe(true);
      if (!createdTrip.ok) throw new Error("failed to create excursion");
      agency.excursionId = createdTrip.id;

      const view = await queries.getExcursionView(agency.excursionId);
      expect(view.ok && view.data).toBeTruthy();
      if (!view.ok || !view.data) throw new Error("missing excursion view");
      const boarding = view.data.boardingPoints[0];
      const seat = view.data.seats.find((item) => item.status === "available");
      expect(boarding && seat).toBeTruthy();
      agency.boardingPointId = boarding.id;
      agency.seatId = seat!.id;

      const createdPassenger = await commands.createPassenger({
        excursionId: agency.excursionId,
        fullName: passengerName,
        phone: "11999999999",
        documentType: "other",
        documentNumber: "RG-1",
        documentIssuer: "",
        boardingPointId: agency.boardingPointId,
        amount: "",
        dueDate: "",
      });
      expect(createdPassenger.ok, JSON.stringify(createdPassenger)).toBe(true);
      if (!createdPassenger.ok) throw new Error("failed to create passenger");
      agency.passengerId = createdPassenger.id;
    }

    await seed(agencyA, "Aparecida", "Passageiro A");
    await seed(agencyB, "Aparecida do Norte", "Passageiro B");

    actAs(agencyA);

    const dashboard = await queries.getDashboard();
    expect(dashboard.ok).toBe(true);
    if (!dashboard.ok) throw new Error("dashboard failed");
    const destinations = dashboard.data.trips.map((item) => item.destination);
    expect(destinations).toContain("Aparecida");
    expect(destinations).not.toContain("Aparecida do Norte");

    const viewB = await queries.getExcursionView(agencyB.excursionId);
    expect(viewB.ok).toBe(true);
    if (viewB.ok) expect(viewB.data).toBeNull();

    const passengerB = await queries.getPassengerFile(
      agencyB.excursionId,
      agencyB.passengerId,
    );
    expect(passengerB.ok).toBe(true);
    if (passengerB.ok) expect(passengerB.data).toBeNull();

    const seatB = await queries.getSeatPage(agencyB.excursionId, agencyB.seatId);
    expect(seatB.ok).toBe(true);
    if (seatB.ok) expect(seatB.data).toBeNull();

    const updateB = await commands.updateExcursion({
      id: agencyB.excursionId,
      destination: "Tentativa de A editar B",
      originCity: "São Paulo",
      departureDate: "2026-12-10",
      returnDate: "2026-12-12",
      status: "open",
    });
    expect(updateB).toEqual({ ok: false, message: NOT_FOUND });

    const addPassengerToB = await commands.createPassenger({
      excursionId: agencyB.excursionId,
      fullName: "Intruso",
      phone: "",
      documentType: "other",
      documentNumber: "",
      documentIssuer: "",
      boardingPointId: agencyB.boardingPointId,
      amount: "",
      dueDate: "",
    });
    expect(addPassengerToB).toEqual({ ok: false, message: NOT_FOUND });

    const assignB = await commands.assignSeat({
      excursionId: agencyB.excursionId,
      seatId: agencyB.seatId,
      passengerId: agencyA.passengerId,
    });
    expect(assignB.ok).toBe(false);

    const nameB = (await sql`
      select destination from excursions where id = ${agencyB.excursionId}
    `) as Array<{ destination: string }>;
    expect(nameB[0].destination).toBe("Aparecida do Norte");

    const passengersOnB = (await sql`
      select full_name from passengers where excursion_id = ${agencyB.excursionId}
    `) as Array<{ full_name: string }>;
    expect(passengersOnB.map((row) => row.full_name)).toEqual(["Passageiro B"]);
  });

  test("sem sessão as actions e o resolvedor falham fechado", { timeout: 60_000 }, async () => {
    const commands = await import("@/lib/services/commands");
    const { resolveTenantContext } = await import("@/lib/security/context");

    state.context = null;
    state.useRealResolver = false;
    const created = await commands.createExcursion({
      destination: "Aparecida",
      originCity: "São Paulo",
      departureDate: "2026-12-10",
      returnDate: "",
      capacity: "4",
      boarding: "Centro",
    });
    expect(created).toEqual({ ok: false, message: SESSION_REQUIRED });

    state.useRealResolver = true;
    await expect(resolveTenantContext()).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof SecurityError &&
        (error.code === "unauthenticated" || error.code === "unconfigured"),
    );
  });

  test("FK composta barra referência cruzada via SQL direto", { timeout: 60_000 }, async () => {
    const tripA = (await sql`
      select id, agency_id from excursions order by created_at asc limit 1
    `) as Array<{ id: string; agency_id: string }>;
    const tripB = (await sql`
      select id, agency_id from excursions order by created_at desc limit 1
    `) as Array<{ id: string; agency_id: string }>;
    expect(tripA[0] && tripB[0]).toBeTruthy();
    expect(tripA[0].agency_id).not.toBe(tripB[0].agency_id);

    try {
      await sql`
        insert into boarding_points (agency_id, excursion_id, name)
        values (${tripB[0].agency_id}, ${tripA[0].id}, 'Ponto cruzado')
      `;
      throw new Error("cruzamento deveria ter sido recusado");
    } catch (error) {
      expect(error).toBeInstanceOf(NeonDbError);
      expect((error as NeonDbError).code).toBe("23503");
    }

    try {
      await sql`
        insert into passengers (agency_id, excursion_id, full_name)
        values (${tripB[0].agency_id}, ${tripA[0].id}, 'Passageiro cruzado')
      `;
      throw new Error("cruzamento deveria ter sido recusado");
    } catch (error) {
      expect(error).toBeInstanceOf(NeonDbError);
      expect((error as NeonDbError).code).toBe("23503");
    }
  });

  test("poltrona dupla é barrada pela constraint única", { timeout: 60_000 }, async () => {
    const seats = (await sql`
      select id, excursion_id, agency_id, seat_number
      from seats
      order by seat_number asc
      limit 1
    `) as Array<{
      id: string;
      excursion_id: string;
      agency_id: string;
      seat_number: number;
    }>;
    expect(seats).toHaveLength(1);
    const seat = seats[0];

    try {
      await sql`
        insert into seats (
          agency_id, excursion_id, seat_number, row_index, side, position, status
        )
        values (
          ${seat.agency_id}, ${seat.excursion_id}, ${seat.seat_number},
          9, 'left', 'window', 'available'
        )
      `;
      throw new Error("poltrona duplicada deveria ter sido recusada");
    } catch (error) {
      expect(error).toBeInstanceOf(NeonDbError);
      expect((error as NeonDbError).code).toBe("23505");
    }
  });
});
