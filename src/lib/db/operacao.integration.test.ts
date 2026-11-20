/**
 * Integration tests against a real Postgres.
 * They run only when TEST_DATABASE_URL is set; `npx vitest run` stays green without it.
 *
 *   TEST_DATABASE_URL='postgresql://...' npx vitest run src/lib/db/operacao.integration.test.ts
 *
 * Never point TEST_DATABASE_URL at the Neon main/production branch.
 */
import { neon } from "@neondatabase/serverless";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

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
}));

vi.mock("@/lib/security/context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security/context")>(
    "@/lib/security/context",
  );
  const { SecurityError } = await import("@/lib/security/errors");
  return {
    ...actual,
    resolveTenantContext: async () => {
      if (!state.context) {
        throw new SecurityError("unauthenticated", "Sessão ausente.");
      }
      return actual.createTestTenantContext(state.context);
    },
  };
});

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim() ?? "";
const enabled = Boolean(testDatabaseUrl);

describe.skipIf(!enabled)("integração operação (Postgres)", () => {
  const sql = enabled ? neon(testDatabaseUrl) : (null as unknown as ReturnType<typeof neon>);

  let userId = "";
  let agencyId = "";
  let excursionId = "";
  let boardingPointId = "";

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.BETTER_AUTH_SECRET =
      process.env.TEST_BETTER_AUTH_SECRET?.trim() ||
      "integration-only-secret-do-not-use-in-prod-32";
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    await resetDatabase();
  }, 60_000);

  afterAll(async () => {
    if (enabled) await resetDatabase();
    delete process.env.DATABASE_URL;
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.BETTER_AUTH_URL;
  }, 60_000);

  beforeEach(() => {
    state.context = null;
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

  function actAs() {
    state.context = {
      subjectId: userId,
      sessionId: crypto.randomUUID(),
      agencyId,
      role: "owner",
    };
  }

  async function seedAgency() {
    await resetDatabase();
    const { getAuth } = await import("@/lib/auth/server");
    const { provisionOwnerAgency } = await import("@/lib/auth/provision");
    const created = await getAuth().api.signUpEmail({
      body: {
        name: "Dona Operação",
        email: `operacao.${crypto.randomUUID()}@example.com`,
        password: "senha-segura-1",
      },
      headers: new Headers(),
    });
    const provisioned = await provisionOwnerAgency({
      userId: created.user.id,
      agencyName: "Agência Operação",
    });
    userId = created.user.id;
    agencyId = provisioned.agencyId;
    actAs();
    const commands = await import("@/lib/services/commands");
    const createdTrip = await commands.createExcursion({
      destination: "Aparecida",
      originCity: "Taubaté",
      departureDate: "2026-12-10",
      returnDate: "2026-12-12",
      capacity: "46",
      boarding: "Terminal",
    });
    expect(createdTrip.ok, JSON.stringify(createdTrip)).toBe(true);
    if (!createdTrip.ok) throw new Error("failed to create excursion");
    excursionId = createdTrip.id;
    const points = (await sql`
      select id from boarding_points
      where excursion_id = ${excursionId} and agency_id = ${agencyId}
      limit 1
    `) as Array<{ id: string }>;
    boardingPointId = points[0]?.id ?? "";
    const seats = (await sql`
      select count(*)::int as count from seats
      where excursion_id = ${excursionId} and agency_id = ${agencyId}
    `) as Array<{ count: number }>;
    expect(seats[0]?.count).toBe(46);
  }

  test("duas atribuições concorrentes da mesma poltrona: só uma vence", { timeout: 60_000 }, async () => {
    await seedAgency();
    const commands = await import("@/lib/services/commands");
    const first = await commands.createPassenger({
      excursionId,
      fullName: "Ana Lima",
      phone: "",
      documentType: "cpf",
      documentNumber: "52998224725",
      documentIssuer: "",
      boardingPointId,
      amount: "",
      dueDate: "",
    });
    const second = await commands.createPassenger({
      excursionId,
      fullName: "Bruno Nunes",
      phone: "",
      documentType: "cpf",
      documentNumber: "11144477735",
      documentIssuer: "",
      boardingPointId,
      amount: "",
      dueDate: "",
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error("failed to create passengers");

    const seats = (await sql`
      select id from seats
      where excursion_id = ${excursionId} and agency_id = ${agencyId} and status = 'available'
      order by seat_number
      limit 1
    `) as Array<{ id: string }>;
    const seatId = seats[0]?.id;
    expect(seatId).toBeTruthy();

    const results = await Promise.all([
      commands.assignSeat({ excursionId, seatId: seatId!, passengerId: first.id }),
      commands.assignSeat({ excursionId, seatId: seatId!, passengerId: second.id }),
    ]);

    const wins = results.filter((item) => item.ok);
    const losses = results.filter((item) => !item.ok);
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(1);

    const occupied = (await sql`
      select passenger_id from seats
      where id = ${seatId} and agency_id = ${agencyId} and status = 'occupied'
    `) as Array<{ passenger_id: string }>;
    expect(occupied).toHaveLength(1);
    expect([first.id, second.id]).toContain(occupied[0]?.passenger_id);
  });

  test("importação CSV grava em transação e não duplica CPF na excursão", { timeout: 60_000 }, async () => {
    await seedAgency();
    const commands = await import("@/lib/services/commands");
    const csv =
      "nome,cpf,telefone,ponto de embarque,observações\n" +
      "Ana Lima,529.982.247-25,12981660131,Terminal,janela\n" +
      "Carla Dias,111.444.777-35,,Terminal,\n";
    const imported = await commands.importPassengers({
      excursionId,
      content: csv,
      byteLength: Buffer.byteLength(csv),
    });
    expect(imported).toEqual({ ok: true, count: 2 });

    const again = await commands.importPassengers({
      excursionId,
      content: csv,
      byteLength: Buffer.byteLength(csv),
    });
    expect(again.ok).toBe(false);

    const { importPassengerRecords } = await import("@/lib/repositories/commands");
    const context = state.context;
    expect(context).toBeTruthy();
    const { createTestTenantContext } = await import("@/lib/security/context");
    const tenant = createTestTenantContext(context!);

    const before = (await sql`
      select count(*)::int as count from passengers
      where excursion_id = ${excursionId} and agency_id = ${agencyId}
    `) as Array<{ count: number }>;

    await expect(
      importPassengerRecords(tenant, {
        excursionId,
        records: [
          {
            fullName: "Nova Pessoa",
            documentType: "cpf",
            documentNumber: "90000000094",
            phone: null,
            boardingPointId,
            notes: null,
          },
          {
            fullName: "Duplicada",
            documentType: "cpf",
            documentNumber: "52998224725",
            phone: null,
            boardingPointId,
            notes: null,
          },
        ],
      }),
    ).rejects.toThrow();

    const after = (await sql`
      select full_name from passengers
      where excursion_id = ${excursionId} and agency_id = ${agencyId}
      order by full_name
    `) as Array<{ full_name: string }>;
    expect(after.map((row) => row.full_name)).toEqual(["Ana Lima", "Carla Dias"]);
    expect(before[0]?.count).toBe(2);
  });
});
