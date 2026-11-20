/**
 * Integration tests against a real Postgres.
 * They run only when TEST_DATABASE_URL is set; `npx vitest run` stays green without it.
 *
 *   TEST_DATABASE_URL='postgresql://...' npx vitest run src/lib/db/lgpd-staff.integration.test.ts
 *
 * Never point TEST_DATABASE_URL at the Neon main/production branch.
 */
import { neon } from "@neondatabase/serverless";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { OWNER_ONLY, NOT_FOUND } from "@/lib/security/errors";
import { INVITE_ALREADY_MEMBER, INVITE_EXPIRED, INVITE_INVALID, hashInviteToken } from "@/lib/domain/invites";
import { ANONYMIZED_DISPLAY_NAME } from "@/lib/domain/lgpd";

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

type AgencyFixture = {
  userId: string;
  agencyId: string;
  email: string;
};

describe.skipIf(!enabled)("integração LGPD e staff (Postgres)", () => {
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
        audit_log,
        agency_invites,
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

  function actAs(fixture: AgencyFixture, role: "owner" | "staff" = "owner") {
    state.context = {
      subjectId: fixture.userId,
      sessionId: crypto.randomUUID(),
      agencyId: fixture.agencyId,
      role,
    };
  }

  async function seedOwner(name: string, agencyName: string): Promise<AgencyFixture> {
    const { getAuth } = await import("@/lib/auth/server");
    const { provisionOwnerAgency } = await import("@/lib/auth/provision");
    const email = `${name.replaceAll(" ", ".").toLowerCase()}.${crypto.randomUUID()}@example.com`;
    const created = await getAuth().api.signUpEmail({
      body: { name, email, password: "senha-segura-1" },
      headers: new Headers(),
    });
    const provisioned = await provisionOwnerAgency({
      userId: created.user.id,
      agencyName,
    });
    return { userId: created.user.id, agencyId: provisioned.agencyId, email };
  }

  async function seedTripWithPassenger(fixture: AgencyFixture, cpf: string, fullName: string) {
    actAs(fixture, "owner");
    const commands = await import("@/lib/services/commands");
    const createdTrip = await commands.createExcursion({
      destination: "Aparecida",
      originCity: "Taubaté",
      departureDate: "2026-12-10",
      returnDate: "2026-12-12",
      capacity: "15",
      boarding: "Terminal",
    });
    expect(createdTrip.ok, JSON.stringify(createdTrip)).toBe(true);
    if (!createdTrip.ok) throw new Error("failed trip");
    const createdPassenger = await commands.createPassenger({
      excursionId: createdTrip.id,
      fullName,
      phone: "12981660131",
      documentType: "cpf",
      documentNumber: cpf,
      documentIssuer: "SSP/SP",
      boardingPointId: "",
      amount: "150,00",
      dueDate: "2026-12-01",
    });
    expect(createdPassenger.ok, JSON.stringify(createdPassenger)).toBe(true);
    if (!createdPassenger.ok) throw new Error("failed passenger");
    return { excursionId: createdTrip.id, passengerId: createdPassenger.id };
  }

  test("convite e auditoria de uma agência não vazam para outra; staff é barrado; token expirado ou reutilizado falha", async () => {
    await resetDatabase();
    agencyA = await seedOwner("Dona A", "Agência A");
    agencyB = await seedOwner("Dona B", "Agência B");

    const tripA = await seedTripWithPassenger(agencyA, "52998224725", "Maria Silva");
    const tripB = await seedTripWithPassenger(agencyB, "11144477735", "Bruno Nunes");

    const lgpd = await import("@/lib/services/lgpd");
    const staff = await import("@/lib/services/staff");
    const audit = await import("@/lib/repositories/audit");
    const invites = await import("@/lib/repositories/invites");

    actAs(agencyA, "owner");
    const exported = await lgpd.exportPassengerData({
      excursionId: tripA.excursionId,
      passengerId: tripA.passengerId,
      format: "json",
      confirmed: true,
    });
    expect(exported.ok).toBe(true);

    actAs(agencyB, "owner");
    const leakedExport = await lgpd.exportPassengerData({
      excursionId: tripA.excursionId,
      passengerId: tripA.passengerId,
      format: "json",
      confirmed: true,
    });
    expect(leakedExport.ok).toBe(false);
    if (!leakedExport.ok) expect(leakedExport.message).toBe(NOT_FOUND);

    const logsB = await audit.listAuditLog(
      (await import("@/lib/security/context")).createTestTenantContext({
        subjectId: agencyB.userId,
        sessionId: "sess-B",
        agencyId: agencyB.agencyId,
        role: "owner",
      }),
    );
    expect(logsB).toEqual([]);

    const logsA = await audit.listAuditLog(
      (await import("@/lib/security/context")).createTestTenantContext({
        subjectId: agencyA.userId,
        sessionId: "sess-A",
        agencyId: agencyA.agencyId,
        role: "owner",
      }),
    );
    expect(logsA).toHaveLength(1);
    expect(logsA[0]?.action).toBe("export_passenger");
    expect(logsA[0]?.entityId).toBe(tripA.passengerId);
    expect(JSON.stringify(logsA)).not.toMatch(/Maria|52998224725|12981660131/i);

    actAs(agencyA, "owner");
    const createdInvite = await staff.createStaffInvite("Agência A");
    expect(createdInvite.ok).toBe(true);
    if (!createdInvite.ok) throw new Error("invite");
    const rawToken = createdInvite.token;

    actAs(agencyB, "owner");
    const invitesB = await invites.listAgencyInvites(
      (await import("@/lib/security/context")).createTestTenantContext({
        subjectId: agencyB.userId,
        sessionId: "sess-B",
        agencyId: agencyB.agencyId,
        role: "owner",
      }),
    );
    expect(invitesB).toEqual([]);

    const { getAuth } = await import("@/lib/auth/server");
    const staffEmail = `staff.${crypto.randomUUID()}@example.com`;
    const staffUser = await getAuth().api.signUpEmail({
      body: { name: "Funcionário A", email: staffEmail, password: "senha-segura-1" },
      headers: new Headers(),
    });
    const accepted = await invites.acceptInviteForUser(staffUser.user.id, rawToken);
    expect(accepted.agencyId).toBe(agencyA.agencyId);

    const reused = invites.acceptInviteForUser(staffUser.user.id, rawToken);
    await expect(reused).rejects.toMatchObject({ kind: "invalid", message: INVITE_INVALID });

    const staffFixture: AgencyFixture = {
      userId: staffUser.user.id,
      agencyId: agencyA.agencyId,
      email: staffEmail,
    };
    actAs(staffFixture, "staff");
    const blocked = await lgpd.anonymizePassenger({
      excursionId: tripA.excursionId,
      passengerId: tripA.passengerId,
      confirmed: true,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.message).toBe(OWNER_ONLY);
    expect((await staff.createStaffInvite("Agência A")).ok).toBe(false);
    expect((await staff.revokeStaff(staffFixture.userId)).ok).toBe(false);

    const stillNamed = (await sql`
      select full_name, document_number, phone
      from passengers
      where id = ${tripA.passengerId}
    `) as Array<{ full_name: string; document_number: string | null; phone: string | null }>;
    expect(stillNamed[0]?.full_name).toBe("Maria Silva");
    expect(stillNamed[0]?.document_number).toBe("52998224725");

    actAs(agencyA, "owner");
    const anonymized = await lgpd.anonymizePassenger({
      excursionId: tripA.excursionId,
      passengerId: tripA.passengerId,
      confirmed: true,
    });
    expect(anonymized.ok).toBe(true);

    const after = (await sql`
      select full_name, document_number, document_issuer, phone, email, notes, anonymized_at
      from passengers
      where id = ${tripA.passengerId} and agency_id = ${agencyA.agencyId}
    `) as Array<{
      full_name: string;
      document_number: string | null;
      document_issuer: string | null;
      phone: string | null;
      email: string | null;
      notes: string | null;
      anonymized_at: Date | string | null;
    }>;
    expect(after[0]?.full_name).toBe(ANONYMIZED_DISPLAY_NAME);
    expect(after[0]?.document_number).toBeNull();
    expect(after[0]?.document_issuer).toBeNull();
    expect(after[0]?.phone).toBeNull();
    expect(after[0]?.email).toBeNull();
    expect(after[0]?.notes).toBeNull();
    expect(after[0]?.anonymized_at).toBeTruthy();

    const amounts = (await sql`
      select amount_cents, status
      from installments
      where passenger_id = ${tripA.passengerId} and agency_id = ${agencyA.agencyId}
    `) as Array<{ amount_cents: number; status: string }>;
    expect(amounts).toEqual([{ amount_cents: 15000, status: "pending" }]);

    const again = await lgpd.anonymizePassenger({
      excursionId: tripA.excursionId,
      passengerId: tripA.passengerId,
      confirmed: true,
    });
    expect(again.ok).toBe(false);

    const expiredToken = "expired-token-for-tests-only-value";
    await sql`
      insert into agency_invites (agency_id, created_by, token_hash, expires_at)
      values (
        ${agencyA.agencyId},
        ${agencyA.userId},
        ${hashInviteToken(expiredToken)},
        now() - interval '1 hour'
      )
    `;
    await expect(invites.acceptInviteForUser(agencyB.userId, expiredToken)).rejects.toMatchObject({
      kind: "expired",
      message: INVITE_EXPIRED,
    });

    actAs(agencyA, "owner");
    const secondInvite = await staff.createStaffInvite("Agência A");
    expect(secondInvite.ok).toBe(true);
    if (!secondInvite.ok) throw new Error("second invite");
    await expect(invites.acceptInviteForUser(agencyB.userId, secondInvite.token)).rejects.toMatchObject({
      kind: "already_member",
      message: INVITE_ALREADY_MEMBER,
    });

    void tripB;
  }, 60_000);

  test("revogar convite: só o dono da agência, só pendente, token deixa de valer", async () => {
    await resetDatabase();
    agencyA = await seedOwner("Dona A", "Agência A");
    agencyB = await seedOwner("Dona B", "Agência B");
    const staff = await import("@/lib/services/staff");
    const invites = await import("@/lib/repositories/invites");

    actAs(agencyA, "owner");
    const created = await staff.createStaffInvite("Agência A");
    if (!created.ok) throw new Error("invite");
    const listed = await staff.loadStaffAdmin();
    if (!listed.ok) throw new Error("list");
    const inviteId = listed.invites[0]!.id;

    actAs(agencyB, "owner");
    const cross = await staff.revokeInvite(inviteId);
    expect(cross.ok).toBe(false);

    actAs(agencyA, "staff");
    const asStaff = await staff.revokeInvite(inviteId);
    expect(asStaff.ok).toBe(false);

    actAs(agencyA, "owner");
    const bad = await staff.revokeInvite("não-é-uuid");
    expect(bad.ok).toBe(false);
    const ok = await staff.revokeInvite(inviteId);
    expect(ok.ok).toBe(true);
    const again = await staff.revokeInvite(inviteId);
    expect(again.ok).toBe(false);

    const preview = await invites.peekInvitePreview(created.token);
    expect(preview.ok).toBe(false);
  }, 60_000);
});
