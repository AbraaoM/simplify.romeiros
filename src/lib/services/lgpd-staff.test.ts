import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  context: null as null | {
    subjectId: string;
    sessionId: string;
    agencyId: string;
    role: "owner" | "staff";
  },
  passengers: [
    {
      id: "p-A",
      excursionId: "trip-A",
      boardingPointId: null,
      fullName: "Maria Silva",
      documentType: "cpf" as const,
      documentNumber: "52998224725",
      documentIssuer: "SSP/SP",
      phone: "12981660131",
      email: "maria@example.com",
      status: "confirmed" as const,
      notes: null,
      anonymizedAt: null,
      createdAt: "2026-11-01T12:00:00.000Z",
      updatedAt: "2026-11-01T12:00:00.000Z",
    },
  ],
  installments: [
    {
      id: "i-A",
      passengerId: "p-A",
      excursionId: "trip-A",
      sequence: 1,
      label: null,
      amountCents: 15000,
      dueDate: "2026-12-01",
      status: "paid" as const,
      paidAt: "2026-11-20T12:00:00.000Z",
      paymentMethod: "pix" as const,
      notes: null,
      createdAt: "",
      updatedAt: "",
    },
  ],
  audits: [] as Array<{ action: string; agencyId: string; entityId: string; payload?: unknown }>,
  anonymize: vi.fn(),
  insertInvite: vi.fn(),
  listInvites: vi.fn(),
  listMembers: vi.fn(),
  revoke: vi.fn(),
  saveAgency: vi.fn(),
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

vi.mock("@/lib/repositories/agency", () => ({
  readAgencyFromDatabase: vi.fn(async (context: { agencyId: string }) => ({
    agency: { id: context.agencyId, name: "Agência A", pixKey: "chave-secreta", pixKeyType: "evp" },
    excursions: [{ id: "trip-A", agencyId: context.agencyId }],
    boardingPoints: [],
    passengers: context.agencyId === "agency-A" ? state.passengers : [],
    seats: [],
    installments: context.agencyId === "agency-A" ? state.installments : [],
    rooms: [],
    roomAssignments: [],
  })),
}));

vi.mock("@/lib/repositories/audit", () => ({
  insertAuditLog: vi.fn(async (context: { agencyId: string }, input: { action: string; entityId: string; payload?: unknown }) => {
    state.audits.push({
      action: input.action,
      agencyId: context.agencyId,
      entityId: input.entityId,
      payload: input.payload,
    });
    return "audit-1";
  }),
  listAuditLog: vi.fn(async (context: { agencyId: string }) =>
    state.audits.filter((item) => item.agencyId === context.agencyId),
  ),
}));

vi.mock("@/lib/repositories/lgpd", () => ({
  anonymizePassengerRecord: (...args: unknown[]) => state.anonymize(...args),
}));

vi.mock("@/lib/repositories/invites", () => ({
  insertAgencyInvite: (...args: unknown[]) => state.insertInvite(...args),
  listAgencyInvites: (...args: unknown[]) => state.listInvites(...args),
  listAgencyMembers: (...args: unknown[]) => state.listMembers(...args),
  revokeStaffMembership: (...args: unknown[]) => state.revoke(...args),
}));

vi.mock("@/lib/repositories/commands", async () => {
  const { assertTenantContext } = await import("@/lib/security/context");
  return {
    WriteConflict: class extends Error {},
    saveAgencyRecord: vi.fn(async (context: unknown) => {
      assertTenantContext(context);
      state.saveAgency(context);
      return "agency-A";
    }),
  };
});

import { saveAgency } from "@/lib/services/commands";
import { anonymizePassenger, exportPassengerData } from "@/lib/services/lgpd";
import { createStaffInvite, inviteWhatsAppUrl, loadStaffAdmin, revokeStaff } from "@/lib/services/staff";
import { OWNER_ONLY, SESSION_REQUIRED } from "@/lib/security/errors";

function asOwner() {
  state.context = {
    subjectId: "user-A",
    sessionId: "sess-A",
    agencyId: "agency-A",
    role: "owner",
  };
}

function asStaff() {
  state.context = {
    subjectId: "user-staff",
    sessionId: "sess-staff",
    agencyId: "agency-A",
    role: "staff",
  };
}

function asB() {
  state.context = {
    subjectId: "user-B",
    sessionId: "sess-B",
    agencyId: "agency-B",
    role: "owner",
  };
}

beforeEach(() => {
  state.audits = [];
  state.anonymize.mockReset();
  state.insertInvite.mockReset();
  state.listInvites.mockReset();
  state.listMembers.mockReset();
  state.revoke.mockReset();
  state.saveAgency.mockReset();
  asOwner();
});

describe("ações de dono", () => {
  test("staff não salva agência, não anonimiza, não gera convite e não revoga", async () => {
    asStaff();
    const saved = await saveAgency({ name: "Agência A", phone: "", city: "" });
    expect(saved.ok).toBe(false);
    if (!saved.ok) expect(saved.message).toBe(OWNER_ONLY);
    expect(state.saveAgency).not.toHaveBeenCalled();
    const blockedAnon = await anonymizePassenger({
      excursionId: "trip-A",
      passengerId: "p-A",
      confirmed: true,
    });
    expect(blockedAnon.ok).toBe(false);
    if (!blockedAnon.ok) expect(blockedAnon.message).toBe(OWNER_ONLY);
    expect(state.anonymize).not.toHaveBeenCalled();
    expect((await createStaffInvite("Agência A")).ok).toBe(false);
    expect(state.insertInvite).not.toHaveBeenCalled();
    expect((await loadStaffAdmin()).ok).toBe(false);
    expect((await revokeStaff("user-staff")).ok).toBe(false);
    expect(state.revoke).not.toHaveBeenCalled();
  });

  test("sem sessão as ações de LGPD e convite falham fechadas", async () => {
    state.context = null;
    const exported = await exportPassengerData({
      excursionId: "trip-A",
      passengerId: "p-A",
      format: "json",
      confirmed: true,
    });
    expect(exported.ok).toBe(false);
    if (!exported.ok) expect(exported.message).toBe(SESSION_REQUIRED);
    const anonymized = await anonymizePassenger({
      excursionId: "trip-A",
      passengerId: "p-A",
      confirmed: true,
    });
    expect(anonymized.ok).toBe(false);
    if (!anonymized.ok) expect(anonymized.message).toBe(SESSION_REQUIRED);
    const invited = await createStaffInvite("Agência A");
    expect(invited.ok).toBe(false);
    if (!invited.ok) expect(invited.message).toBe(SESSION_REQUIRED);
  });
});

describe("exportação e anonimização", () => {
  test("pede confirmação e não vaza passageiro de outra agência", async () => {
    const missingConfirm = await exportPassengerData({
      excursionId: "trip-A",
      passengerId: "p-A",
      format: "json",
      confirmed: false,
    });
    expect(missingConfirm.ok).toBe(false);
    expect(state.audits).toHaveLength(0);

    asB();
    const leaked = await exportPassengerData({
      excursionId: "trip-A",
      passengerId: "p-A",
      format: "json",
      confirmed: true,
    });
    expect(leaked.ok).toBe(false);
    if (!leaked.ok) expect(leaked.message).toBe("Não encontrado.");
    expect(state.audits).toHaveLength(0);
  });

  test("exporta um passageiro e registra auditoria sem dados pessoais", async () => {
    const exported = await exportPassengerData({
      excursionId: "trip-A",
      passengerId: "p-A",
      format: "json",
      confirmed: true,
    });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.content).toContain("Maria Silva");
    expect(exported.content).toContain("15000");
    expect(state.audits).toEqual([
      {
        action: "export_passenger",
        agencyId: "agency-A",
        entityId: "p-A",
        payload: { format: "json" },
      },
    ]);
    expect(JSON.stringify(state.audits)).not.toMatch(/Maria|52998224725|12981660131/i);
  });

  test("anonimização confirmada chama o repositório e audita", async () => {
    state.anonymize.mockResolvedValue({ ok: true });
    const result = await anonymizePassenger({
      excursionId: "trip-A",
      passengerId: "p-A",
      confirmed: true,
    });
    expect(result.ok).toBe(true);
    expect(state.anonymize).toHaveBeenCalledOnce();
    expect(state.audits[0]?.action).toBe("anonymize_passenger");
    expect(JSON.stringify(state.audits)).not.toMatch(/Maria|52998224725/i);
  });
});

describe("convite", () => {
  test("o link de WhatsApp não leva para o número do produto e não contém o token em texto aberto no wa.me de contato", () => {
    const url = inviteWhatsAppUrl("Agência Boa Viagem", "TOKENSECRETO123");
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(url).not.toContain("5512981660131");
    expect(decodeURIComponent(url)).toContain("TOKENSECRETO123");
    expect(decodeURIComponent(url)).toContain("Agência Boa Viagem");
  });
});
