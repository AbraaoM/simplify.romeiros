import { expect, test } from "vitest";
import type { AgencyData, Excursion, Installment, Passenger } from "@/lib/domain/types";
import {
  projectDashboard,
  projectDueAttention,
  projectExcursion,
  projectPassengerFile,
  projectSeatPage,
} from "./views";

const today = "2026-10-16";

test("leads with the overdue count", () => {
  const data = agency();
  data.installments.push(parcel("p1", "2026-10-10"), parcel("p2", today, "parcel-2"));
  expect(projectDashboard(data, today).headline).toEqual({
    kind: "overdue",
    count: 1,
  });
});

test("leads with due today when nothing is overdue", () => {
  const data = agency();
  data.installments.push(parcel("p1", today));
  expect(projectDashboard(data, today).headline).toEqual({
    kind: "due_today",
    count: 1,
  });
});

test("names the next departure when every parcel is still in the future", () => {
  const data = agency();
  data.installments.push(parcel("p1", "2026-11-01"));
  expect(projectDashboard(data, today).headline).toEqual({
    kind: "next_departure",
    destination: "Aparecida",
    departureAt: "2026-10-17T07:00:00-03:00",
  });
});

test("stays empty when no trip is open or closed", () => {
  const data = agency();
  data.excursions[0].status = "completed";
  expect(projectDashboard(data, today).headline).toEqual({ kind: "empty" });
  expect(projectDashboard(data, today).trips).toEqual([]);
});

test("keeps a cancelled passenger out of the attention list and the overdue count", () => {
  const data = agency();
  data.passengers[0].status = "cancelled";
  data.installments.push(parcel("p1", "2026-10-01"));
  expect(projectDueAttention(data, today)).toEqual([]);
  expect(projectDashboard(data, today).headline.kind).not.toBe("overdue");
});

test("caps the dashboard list at five and keeps the full pending list", () => {
  const data = agency();
  data.passengers = Array.from({ length: 6 }, (_, index) =>
    person(`p${index}`, `Pessoa ${index}`),
  );
  data.installments = data.passengers.map((passenger, index) =>
    parcel(passenger.id, today, `parcel-${index}`),
  );
  expect(projectDashboard(data, today).attention).toHaveLength(5);
  expect(projectDueAttention(data, today)).toHaveLength(6);
});

test("drops an installment filed on another excursion", () => {
  const data = agency();
  const wrong = parcel("p1", "2026-10-01");
  wrong.excursionId = "other";
  data.installments.push(wrong);
  expect(projectDueAttention(data, today)).toEqual([]);
});

test("opens a passenger file with installments in sequence", () => {
  const data = agency();
  data.installments.push(parcel("p1", "2026-10-20", "later"));
  data.installments.push({ ...parcel("p1", "2026-10-10", "earlier"), sequence: 2 });
  data.seats.push({
    id: "s1",
    excursionId: "trip",
    seatNumber: 1,
    rowIndex: 1,
    side: "left",
    position: "window",
    status: "occupied",
    passengerId: "p1",
    notes: null,
    createdAt: "",
    updatedAt: "",
  });
  const file = projectPassengerFile(data, "trip", "p1");
  expect(file?.seatNumber).toBe(1);
  expect(file?.installments.map((item) => item.id)).toEqual(["later", "earlier"]);
  expect(file?.pendingInstallmentId).toBe("earlier");
  expect(projectPassengerFile(data, "trip", "missing")).toBeNull();
});

test("lists active passengers who can take a seat", () => {
  const data = agency();
  data.passengers.push(person("p2", "João Ribeiro"));
  data.passengers.push({ ...person("p3", "Fernanda Costa"), status: "cancelled" });
  data.seats.push({
    id: "s1",
    excursionId: "trip",
    seatNumber: 1,
    rowIndex: 1,
    side: "left",
    position: "window",
    status: "occupied",
    passengerId: "p1",
    notes: null,
    createdAt: "",
    updatedAt: "",
  });
  const page = projectSeatPage(data, "trip", "s1");
  expect(page?.passengerName).toBe("Maria Souza");
  expect(page?.choices.map((choice) => choice.id)).toEqual(["p2"]);
  expect(projectSeatPage(data, "trip", "missing")).toBeNull();
});

test("returns null for an unknown excursion and marks a broken seat map", () => {
  const data = agency();
  expect(projectExcursion(data, "missing", today)).toBeNull();
  data.seats.pop();
  const view = projectExcursion(data, "trip", today);
  expect(view?.mapMode).toBe("list");
  expect(view?.mapIncomplete).toBe(true);
});

function agency(): AgencyData {
  return {
    agency: {
      id: "agency",
      name: "Vale Romarias",
      phone: null,
      city: "Taubaté",
      notes: null,
      createdAt: "",
      updatedAt: "",
    },
    excursions: [trip()],
    boardingPoints: [],
    passengers: [person("p1", "Maria Souza")],
    seats: [],
    installments: [],
    rooms: [],
    roomAssignments: [],
  };
}

function trip(): Excursion {
  return {
    id: "trip",
    agencyId: "agency",
    destination: "Aparecida",
    originCity: "Taubaté",
    departureAt: "2026-10-17T07:00:00-03:00",
    returnAt: null,
    vehicleCapacity: 4,
    vehicleLabel: null,
    status: "open",
    notes: null,
    createdAt: "",
    updatedAt: "",
  };
}

function person(id: string, fullName: string): Passenger {
  return {
    id,
    excursionId: "trip",
    boardingPointId: null,
    fullName,
    documentType: "cpf",
    documentNumber: "90000000001",
    documentIssuer: null,
    phone: null,
    email: null,
    status: "confirmed",
    notes: null,
    createdAt: "",
    updatedAt: "",
  };
}

function parcel(
  passengerId: string,
  dueDate: string,
  id = "parcel",
): Installment {
  return {
    id,
    passengerId,
    excursionId: "trip",
    sequence: 1,
    label: null,
    amountCents: 15000,
    dueDate,
    status: "pending",
    paidAt: null,
    paymentMethod: null,
    notes: null,
    createdAt: "",
    updatedAt: "",
  };
}
