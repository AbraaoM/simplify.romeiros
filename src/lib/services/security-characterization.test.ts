import { beforeEach, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  context: {
    subjectId: "user-A",
    sessionId: "sess-A",
    agencyId: "agency-A",
    role: "owner" as const,
  },
  read: vi.fn(),
  update: vi.fn(),
  paid: vi.fn(),
  seat: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("@/lib/security/context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security/context")>(
    "@/lib/security/context",
  );
  return {
    ...actual,
    resolveTenantContext: async () => actual.createTestTenantContext(mocks.context),
  };
});

vi.mock("@/lib/repositories/agency", () => ({
  readAgencyFromDatabase: mocks.read,
}));

vi.mock("@/lib/repositories/commands", () => ({
  WriteConflict: class extends Error {},
  updateExcursionRecord: mocks.update,
  markInstallmentPaid: mocks.paid,
  applySeatChange: mocks.seat,
  cancelPassengerRecord: mocks.cancel,
}));

import { assignSeat, cancelPassenger, updateExcursion, markPaid } from "./commands";

function data() {
  return {
    agency: { id: "agency-A" },
    excursions: [{ id: "trip-A" }],
    passengers: [{ id: "p-A", excursionId: "trip-A", status: "reserved" }],
    seats: [{ id: "s-A", excursionId: "trip-A", status: "available", passengerId: null }],
    installments: [{ id: "i-A", passengerId: "p-A", excursionId: "trip-A", status: "pending" }],
    boardingPoints: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue(data());
});

test("ID de outra agência é recusado e não chega à escrita", async () => {
  const input = {
    id: "trip-B",
    destination: "Teste",
    originCity: "",
    departureDate: "2026-11-09",
    returnDate: "",
    status: "open",
  };
  expect((await updateExcursion(input)).ok).toBe(false);
  expect(mocks.update).not.toHaveBeenCalled();
  expect((await updateExcursion({ ...input, id: "trip-A" })).ok).toBe(true);
  expect(mocks.update).toHaveBeenCalledOnce();
});

test("passageiro/parcela de outro escopo não chegam à escrita", async () => {
  expect((await assignSeat({ excursionId: "trip-A", passengerId: "p-B", seatId: "s-A" })).ok).toBe(
    false,
  );
  expect(
    (await markPaid({ excursionId: "trip-A", passengerId: "p-B", installmentId: "i-A" })).ok,
  ).toBe(false);
  expect(mocks.seat).not.toHaveBeenCalled();
  expect(mocks.paid).not.toHaveBeenCalled();
});

test("snapshot atrasado: simulação caracteriza cancelamento seguido de atribuição ainda aceito pelo serviço", async () => {
  mocks.cancel.mockResolvedValue(true);
  mocks.seat.mockResolvedValue(true);
  expect(
    (await cancelPassenger({ excursionId: "trip-A", passengerId: "p-A", confirmed: true })).ok,
  ).toBe(true);
  expect(
    (await assignSeat({ excursionId: "trip-A", passengerId: "p-A", seatId: "s-A" })).ok,
  ).toBe(true);
  // Mock retorna snapshot antigo: não é teste de transação SQL real.
  expect(mocks.seat).toHaveBeenCalledOnce();
});
