import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/repositories/audit", () => ({
  insertAuditLog: vi.fn(async () => "audit-1"),
  listAuditLog: vi.fn(async () => []),
}));

const state = vi.hoisted(() => {
  const AGENCY_A = "agency-A";
  const AGENCY_B = "agency-B";

  function snapshot(agencyId: string) {
    if (agencyId === AGENCY_A) {
      return {
        agency: {
          id: AGENCY_A,
          name: "Agência A",
          trialEndsAt: "2026-12-04T00:00:00.000Z",
        },
        excursions: [
          { id: "trip-A", agencyId: AGENCY_A, destination: "Aparecida", status: "open", departureAt: "2026-12-12T08:00:00-03:00" },
        ],
        boardingPoints: [{ id: "bp-A", excursionId: "trip-A", name: "Centro" }],
        passengers: [
          { id: "p-A", excursionId: "trip-A", status: "reserved", boardingPointId: "bp-A" },
        ],
        seats: [
          { id: "s-A", excursionId: "trip-A", status: "available", passengerId: null },
          { id: "s-A-busy", excursionId: "trip-A", status: "occupied", passengerId: "p-A" },
        ],
        installments: [
          {
            id: "i-A",
            passengerId: "p-A",
            excursionId: "trip-A",
            status: "pending",
            dueDate: "2026-12-20",
            sequence: 1,
          },
        ],
        rooms: [{ id: "r-A", excursionId: "trip-A" }],
        roomAssignments: [],
      };
    }
    if (agencyId === AGENCY_B) {
      return {
        agency: {
          id: AGENCY_B,
          name: "Agência B",
          trialEndsAt: "2026-12-04T00:00:00.000Z",
        },
        excursions: [
          { id: "trip-B", agencyId: AGENCY_B, destination: "Aparecida", status: "open", departureAt: "2026-12-12T08:00:00-03:00" },
        ],
        boardingPoints: [{ id: "bp-B", excursionId: "trip-B", name: "Centro" }],
        passengers: [
          { id: "p-B", excursionId: "trip-B", status: "reserved", boardingPointId: "bp-B" },
        ],
        seats: [{ id: "s-B", excursionId: "trip-B", status: "available", passengerId: null }],
        installments: [
          {
            id: "i-B",
            passengerId: "p-B",
            excursionId: "trip-B",
            status: "pending",
            dueDate: "2026-12-20",
            sequence: 1,
          },
        ],
        rooms: [{ id: "r-B", excursionId: "trip-B" }],
        roomAssignments: [],
      };
    }
    return {
      agency: null,
      excursions: [],
      boardingPoints: [],
      passengers: [],
      seats: [],
      installments: [],
      rooms: [],
      roomAssignments: [],
    };
  }

  function owned(agencyId: string, collection: string, id: string): boolean {
    const data = snapshot(agencyId) as unknown as Record<string, Array<{ id: string }>>;
    return (data[collection] ?? []).some((item) => item.id === id);
  }

  return {
    AGENCY_A,
    AGENCY_B,
    context: null as null | {
      subjectId: string;
      sessionId: string;
      agencyId: string;
      role: "owner" | "staff";
    },
    writes: [] as Array<{ fn: string; agencyId: string }>,
    snapshot,
    owned,
  };
});

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
  readAgencyFromDatabase: vi.fn(async (context: { agencyId: string }) => {
    return state.snapshot(context.agencyId);
  }),
}));

vi.mock("@/lib/repositories/commands", async () => {
  const { RecordNotFound } = await import("@/lib/security/errors");
  const { assertTenantContext } = await import("@/lib/security/context");

  function track<T>(fn: string, context: unknown, run: () => T): T {
    const scoped = assertTenantContext(context);
    state.writes.push({ fn, agencyId: scoped.agencyId });
    return run();
  }

  return {
    WriteConflict: class extends Error {},
    saveAgencyRecord: vi.fn(async (context: unknown) =>
      track("saveAgencyRecord", context, () => "agency-A"),
    ),
    insertExcursion: vi.fn(async (context: unknown) =>
      track("insertExcursion", context, () => "trip-new"),
    ),
    updateExcursionRecord: vi.fn(async (context: unknown, input: { id: string }) =>
      track("updateExcursionRecord", context, () => {
        if (!state.owned(assertTenantContext(context).agencyId, "excursions", input.id)) {
          throw new RecordNotFound();
        }
      }),
    ),
    insertBoardingPoint: vi.fn(async (context: unknown, excursionId: string) =>
      track("insertBoardingPoint", context, () => {
        if (!state.owned(assertTenantContext(context).agencyId, "excursions", excursionId)) {
          throw new RecordNotFound();
        }
      }),
    ),
    insertPassengerRecord: vi.fn(async (context: unknown, input: { excursionId: string }) =>
      track("insertPassengerRecord", context, () => {
        if (!state.owned(assertTenantContext(context).agencyId, "excursions", input.excursionId)) {
          throw new RecordNotFound();
        }
        return "p-new";
      }),
    ),
    updatePassengerRecord: vi.fn(async (context: unknown, input: { id: string }) =>
      track("updatePassengerRecord", context, () => {
        if (!state.owned(assertTenantContext(context).agencyId, "passengers", input.id)) {
          throw new RecordNotFound();
        }
      }),
    ),
    insertInstallmentRecord: vi.fn(async (context: unknown, input: { passengerId: string }) =>
      track("insertInstallmentRecord", context, () => {
        if (!state.owned(assertTenantContext(context).agencyId, "passengers", input.passengerId)) {
          throw new RecordNotFound();
        }
      }),
    ),
    markInstallmentPaid: vi.fn(async (context: unknown, id: string) =>
      track("markInstallmentPaid", context, () =>
        state.owned(assertTenantContext(context).agencyId, "installments", id),
      ),
    ),
    applySeatChange: vi.fn(
      async (
        context: unknown,
        input: { occupySeatId?: string | null; releaseSeatId?: string | null },
      ) =>
        track("applySeatChange", context, () => {
          const seatId = input.occupySeatId ?? input.releaseSeatId;
          return (
            !seatId ||
            state.owned(assertTenantContext(context).agencyId, "seats", seatId)
          );
        }),
    ),
    cancelPassengerRecord: vi.fn(async (context: unknown, input: { passengerId: string }) =>
      track("cancelPassengerRecord", context, () =>
        state.owned(assertTenantContext(context).agencyId, "passengers", input.passengerId),
      ),
    ),
    importPassengerRecords: vi.fn(async (context: unknown, input: { excursionId: string }) =>
      track("importPassengerRecords", context, () => {
        if (!state.owned(assertTenantContext(context).agencyId, "excursions", input.excursionId)) {
          throw new RecordNotFound();
        }
        return ["p-new"];
      }),
    ),
  };
});

import {
  addBoardingPoint,
  addInstallment,
  assignSeat,
  cancelPassenger,
  createExcursion,
  createPassenger,
  importPassengers,
  markPaid,
  previewPassengerCsv,
  releaseSeat,
  saveAgency,
  updateExcursion,
  updatePassenger,
} from "./commands";
import {
  getDashboard,
  getExcursionView,
  getPassengerExport,
  getPassengerFile,
  getSeatPage,
  listDueAttention,
} from "./queries";
import { updateExcursionRecord } from "@/lib/repositories/commands";

const { AGENCY_A, AGENCY_B } = state;

function asA() {
  state.context = {
    subjectId: "user-A",
    sessionId: "sess-A",
    agencyId: AGENCY_A,
    role: "owner",
  };
}

function asNone() {
  state.context = null;
}

beforeEach(() => {
  state.writes = [];
  asA();
  vi.clearAllMocks();
});

const sessionlessCommands = [
  ["saveAgency", () => saveAgency({ name: "Agência", phone: "", city: "" })],
  [
    "createExcursion",
    () =>
      createExcursion({
        destination: "Aparecida",
        originCity: "",
        departureDate: "2026-12-12",
        returnDate: "",
        capacity: "4",
        boarding: "Centro",
      }),
  ],
  [
    "updateExcursion",
    () =>
      updateExcursion({
        id: "trip-A",
        destination: "Aparecida",
        originCity: "",
        departureDate: "2026-12-12",
        returnDate: "",
        status: "open",
      }),
  ],
  ["addBoardingPoint", () => addBoardingPoint({ excursionId: "trip-A", name: "Rodoviária" })],
  [
    "createPassenger",
    () =>
      createPassenger({
        excursionId: "trip-A",
        fullName: "Maria",
        phone: "",
        documentType: "cpf",
        documentNumber: "",
        documentIssuer: "",
        boardingPointId: "",
        amount: "",
        dueDate: "",
      }),
  ],
  [
    "updatePassenger",
    () =>
      updatePassenger({
        excursionId: "trip-A",
        passengerId: "p-A",
        fullName: "Maria",
        phone: "",
        documentType: "cpf",
        documentNumber: "",
        documentIssuer: "",
        boardingPointId: "",
      }),
  ],
  [
    "addInstallment",
    () =>
      addInstallment({
        excursionId: "trip-A",
        passengerId: "p-A",
        amount: "100",
        dueDate: "2026-12-20",
      }),
  ],
  [
    "markPaid",
    () =>
      markPaid({
        excursionId: "trip-A",
        passengerId: "p-A",
        installmentId: "i-A",
      }),
  ],
  ["assignSeat", () => assignSeat({ excursionId: "trip-A", seatId: "s-A", passengerId: "p-A" })],
  ["releaseSeat", () => releaseSeat({ excursionId: "trip-A", seatId: "s-A-busy" })],
  [
    "cancelPassenger",
    () => cancelPassenger({ excursionId: "trip-A", passengerId: "p-A", confirmed: true }),
  ],
  [
    "previewPassengerCsv",
    () =>
      previewPassengerCsv({
        excursionId: "trip-A",
        content: "nome\nMaria",
        byteLength: 10,
      }),
  ],
  [
    "importPassengers",
    () =>
      importPassengers({
        excursionId: "trip-A",
        content: "nome\nMaria",
        byteLength: 10,
      }),
  ],
] as const;

const sessionlessQueries = [
  ["getDashboard", () => getDashboard("2026-11-20")],
  ["listDueAttention", () => listDueAttention("2026-11-20")],
  ["getExcursionView", () => getExcursionView("trip-A", "2026-11-20")],
  ["getPassengerFile", () => getPassengerFile("trip-A", "p-A", "2026-11-20")],
  ["getSeatPage", () => getSeatPage("trip-A", "s-A", "2026-11-20")],
  ["getPassengerExport", () => getPassengerExport("trip-A")],
] as const;

describe("sem sessão tudo falha fechado", () => {
  test.each(sessionlessCommands)("%s recusa sem sessão e não escreve", async (_name, run) => {
    asNone();
    const result = await run();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/entre novamente/i);
    expect(state.writes).toEqual([]);
  });

  test.each(sessionlessQueries)("%s recusa sem sessão", async (_name, run) => {
    asNone();
    const result = await run();
    expect(result).toEqual({ ok: false, error: "unauthenticated" });
  });
});

describe("agência A não lê nem altera dados da B", () => {
  test("consultas da agência A não devolvem IDs da B — retornam não encontrado", async () => {
    const excursion = await getExcursionView("trip-B", "2026-11-20");
    expect(excursion.ok && excursion.data).toBe(null);
    const passenger = await getPassengerFile("trip-B", "p-B", "2026-11-20");
    expect(passenger.ok && passenger.data).toBe(null);
    const seat = await getSeatPage("trip-B", "s-B", "2026-11-20");
    expect(seat.ok && seat.data).toBe(null);
    const exported = await getPassengerExport("trip-B");
    expect(exported.ok && exported.data).toBe(null);
    const dashboard = await getDashboard("2026-11-20");
    expect(dashboard.ok && dashboard.data.agencyName).toBe("Agência A");
    expect(JSON.stringify(dashboard)).not.toContain("trip-B");
    expect(JSON.stringify(dashboard)).not.toContain("Agência B");
    const attention = await listDueAttention("2026-11-20");
    expect(JSON.stringify(attention)).not.toContain("trip-B");
  });

  test("saveAgency e createExcursion usam só o contexto da A", async () => {
    expect((await saveAgency({ name: "Agência A", phone: "", city: "" })).ok).toBe(true);
    const created = await createExcursion({
      destination: "Aparecida",
      originCity: "",
      departureDate: "2026-12-12",
      returnDate: "",
      capacity: "4",
      boarding: "Centro",
    });
    expect(created.ok).toBe(true);
    expect(state.writes.every((item) => item.agencyId === AGENCY_A)).toBe(true);
    expect(state.writes.map((item) => item.fn)).toEqual([
      "saveAgencyRecord",
      "insertExcursion",
    ]);
  });

  test("updateExcursion, addBoardingPoint e createPassenger recusam IDs da B", async () => {
    const update = await updateExcursion({
      id: "trip-B",
      destination: "Aparecida",
      originCity: "",
      departureDate: "2026-12-12",
      returnDate: "",
      status: "open",
    });
    expect(update.ok).toBe(false);
    if (!update.ok) expect(update.message).toBe("Não encontrado.");
    expect((await addBoardingPoint({ excursionId: "trip-B", name: "Rodoviária" })).ok).toBe(
      false,
    );
    expect(
      (
        await createPassenger({
          excursionId: "trip-B",
          fullName: "Maria",
          phone: "",
          documentType: "cpf",
          documentNumber: "",
          documentIssuer: "",
          boardingPointId: "bp-B",
          amount: "",
          dueDate: "",
        })
      ).ok,
    ).toBe(false);
    expect(state.writes).toEqual([]);
  });

  test("updatePassenger, addInstallment e markPaid recusam IDs da B", async () => {
    expect(
      (
        await updatePassenger({
          excursionId: "trip-B",
          passengerId: "p-B",
          fullName: "Maria",
          phone: "",
          documentType: "cpf",
          documentNumber: "",
          documentIssuer: "",
          boardingPointId: "bp-B",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await addInstallment({
          excursionId: "trip-B",
          passengerId: "p-B",
          amount: "100",
          dueDate: "2026-12-20",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await markPaid({
          excursionId: "trip-B",
          passengerId: "p-B",
          installmentId: "i-B",
        })
      ).ok,
    ).toBe(false);
    expect(state.writes).toEqual([]);
  });

  test("assignSeat, releaseSeat e cancelPassenger recusam IDs da B", async () => {
    expect(
      (await assignSeat({ excursionId: "trip-B", seatId: "s-B", passengerId: "p-B" })).ok,
    ).toBe(false);
    expect((await releaseSeat({ excursionId: "trip-B", seatId: "s-B" })).ok).toBe(false);
    expect(
      (await cancelPassenger({ excursionId: "trip-B", passengerId: "p-B", confirmed: true })).ok,
    ).toBe(false);
    expect(state.writes).toEqual([]);
  });

  test("repositório recusa contexto forjado com agencyId da B", async () => {
    await expect(
      updateExcursionRecord({ agencyId: AGENCY_B } as never, {
        id: "trip-A",
        destination: "Aparecida",
        originCity: null,
        departureAt: "2026-12-12T00:00:00.000Z",
        returnAt: null,
        status: "open",
      }),
    ).rejects.toThrow();
  });
});
