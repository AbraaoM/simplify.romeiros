import { expect, test } from "vitest";
import { buildPassengerExportSnapshot, passengerExportCsv } from "./lgpd";
import type { BoardingPoint, Installment, Passenger, Seat } from "./types";

const passenger: Passenger = {
  id: "p1",
  excursionId: "ex1",
  boardingPointId: "bp1",
  fullName: "Maria Silva",
  documentType: "cpf",
  documentNumber: "52998224725",
  documentIssuer: "SSP/SP",
  phone: "12981660131",
  email: "maria@example.com",
  status: "confirmed",
  notes: null,
  anonymizedAt: null,
  createdAt: "2026-11-01T12:00:00.000Z",
  updatedAt: "2026-11-02T12:00:00.000Z",
};

const installments: Installment[] = [
  {
    id: "i1",
    passengerId: "p1",
    excursionId: "ex1",
    sequence: 1,
    label: null,
    amountCents: 15000,
    dueDate: "2026-12-01",
    status: "paid",
    paidAt: "2026-11-20T12:00:00.000Z",
    paymentMethod: "pix",
    notes: null,
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-20T12:00:00.000Z",
  },
];

const seats: Seat[] = [
  {
    id: "s1",
    excursionId: "ex1",
    seatNumber: 4,
    rowIndex: 1,
    side: "left",
    position: "window",
    status: "occupied",
    passengerId: "p1",
    notes: null,
    createdAt: "",
    updatedAt: "",
  },
];

const points: BoardingPoint[] = [
  {
    id: "bp1",
    excursionId: "ex1",
    name: "Centro",
    address: null,
    departAt: null,
    sortOrder: 0,
    notes: null,
    createdAt: "",
  },
];

test("exports one passenger with installments and no other people", () => {
  const snapshot = buildPassengerExportSnapshot({
    passenger,
    installments,
    seats,
    boardingPoints: points,
  });
  expect(snapshot.passenger.fullName).toBe("Maria Silva");
  expect(snapshot.passenger.seatNumber).toBe(4);
  expect(snapshot.passenger.boardingPointName).toBe("Centro");
  expect(snapshot.installments).toHaveLength(1);
  expect(snapshot.installments[0]?.amountCents).toBe(15000);
  const csv = passengerExportCsv(snapshot);
  expect(csv).toContain("Maria Silva");
  expect(csv).toContain("15000");
  expect(csv).toContain("52998224725");
});
