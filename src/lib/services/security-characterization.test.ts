import { beforeEach, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), paid: vi.fn(), seat: vi.fn(), cancel: vi.fn() }));
// Bypass EXPLÍCITO da barreira apenas neste teste para caracterizar legado.
vi.mock("@/lib/db/client", () => ({ getSql: () => ({}) }));
vi.mock("@/lib/repositories/agency", () => ({ readAgencyFromDatabase: mocks.read }));
vi.mock("@/lib/repositories/commands", () => ({
  WriteConflict: class extends Error {}, updateExcursionRecord: mocks.update,
  markInstallmentPaid: mocks.paid, applySeatChange: mocks.seat, cancelPassengerRecord: mocks.cancel,
}));
import { assignSeat, cancelPassenger, updateExcursion, markPaid } from "./commands";
function data() { return { agency: { id: "agency-A" }, excursions: [{ id: "trip-A" }], passengers: [{ id: "p-A", excursionId: "trip-A", status: "reserved" }], seats: [{ id: "s-A", excursionId: "trip-A", status: "available", passengerId: null }], installments: [{ id: "i-A", passengerId: "p-A", excursionId: "trip-A", status: "pending" }], boardingPoints: [] }; }
beforeEach(() => { vi.clearAllMocks(); mocks.read.mockResolvedValue(data()); });
test("ID de excursão fora do snapshot é recusado; agência selecionada não autentica usuário", async () => {
  const input = { id: "trip-B", destination: "Teste", originCity: "", departureDate: "2026-11-09", returnDate: "", status: "open" };
  expect((await updateExcursion(input)).ok).toBe(false);
  expect(mocks.update).not.toHaveBeenCalled();
  // Sem sessão, o legado aceita qualquer chamador para trip-A se DB fosse liberado.
  expect((await updateExcursion({ ...input, id: "trip-A" })).ok).toBe(true);
  expect(mocks.update).toHaveBeenCalledOnce();
});
test("passageiro/parcela de outro escopo não chegam à escrita", async () => {
  expect((await assignSeat({ excursionId: "trip-A", passengerId: "p-B", seatId: "s-A" })).ok).toBe(false);
  expect((await markPaid({ excursionId: "trip-A", passengerId: "p-B", installmentId: "i-A" })).ok).toBe(false);
  expect(mocks.seat).not.toHaveBeenCalled(); expect(mocks.paid).not.toHaveBeenCalled();
});
test("snapshot atrasado: simulação caracteriza cancelamento seguido de atribuição ainda aceito pelo serviço", async () => {
  mocks.cancel.mockResolvedValue(true); mocks.seat.mockResolvedValue(true);
  expect((await cancelPassenger({ excursionId: "trip-A", passengerId: "p-A", confirmed: true })).ok).toBe(true);
  expect((await assignSeat({ excursionId: "trip-A", passengerId: "p-A", seatId: "s-A" })).ok).toBe(true);
  // Mock retorna snapshot antigo: não é teste de transação SQL real.
  expect(mocks.seat).toHaveBeenCalledOnce();
});
