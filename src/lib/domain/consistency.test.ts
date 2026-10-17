import { expect, test } from "vitest";
import { collectIssues } from "./consistency";
import type {
  AgencyData,
  Passenger,
  Seat,
} from "./types";

test("accepts a coherent 2+2 excursion", () => {
  expect(collectIssues(graph(), "trip")).toEqual([]);
});

test("flags a boarding point from another excursion", () => {
  const data = graph();
  data.boardingPoints[0].excursionId = "other";
  expect(collectIssues(data, "trip")).toContain("boarding_point_excursion");
});

test("flags a seat whose passenger belongs to another excursion", () => {
  const data = graph();
  data.passengers[0].excursionId = "other";
  expect(collectIssues(data, "trip")).toContain("seat_passenger_excursion");
});

test("flags an occupied seat held by a cancelled passenger", () => {
  const data = graph();
  data.passengers[0].status = "cancelled";
  expect(collectIssues(data, "trip")).toContain("occupied_cancelled_passenger");
});

test("flags a seat count that does not match capacity", () => {
  const data = graph();
  data.seats.pop();
  expect(collectIssues(data, "trip")).toContain("seat_count");
});

test("flags an occupied seat without a passenger", () => {
  const data = graph();
  data.seats[0].passengerId = null;
  expect(collectIssues(data, "trip")).toContain("seat_status_passenger");
});

test("flags an available seat that still points at a passenger", () => {
  const data = graph();
  data.seats[1].passengerId = "maria";
  expect(collectIssues(data, "trip")).toContain("seat_status_passenger");
});

test("flags the same passenger on two seats", () => {
  const data = graph();
  data.seats[1].status = "occupied";
  data.seats[1].passengerId = "maria";
  expect(collectIssues(data, "trip")).toContain("duplicate_passenger_seat");
});

test("flags an installment recorded on the wrong excursion", () => {
  const data = graph();
  data.installments[0].excursionId = "other";
  expect(collectIssues(data, "trip")).toContain("installment_excursion");
});

test("flags a room assignment from another excursion", () => {
  const data = graph();
  data.passengers.push(passenger("ana", "other"));
  data.roomAssignments.push({
    id: "assign-2",
    roomId: "room",
    passengerId: "ana",
    createdAt: "",
  });
  expect(collectIssues(data, "trip")).toContain("room_excursion");
});

test("flags a room filled past its capacity", () => {
  const data = graph();
  data.rooms[0].capacity = 1;
  data.passengers.push(passenger("ana", "trip"));
  data.roomAssignments.push({
    id: "assign-2",
    roomId: "room",
    passengerId: "ana",
    createdAt: "",
  });
  expect(collectIssues(data, "trip")).toContain("room_capacity");
});

test("flags a CPF that is not 11 digits and allows a missing document", () => {
  const invalid = graph();
  invalid.passengers[0].documentNumber = "123";
  expect(collectIssues(invalid, "trip")).toContain("cpf_digits");

  const missing = graph();
  missing.passengers[0].documentNumber = null;
  expect(collectIssues(missing, "trip")).not.toContain("cpf_digits");
});

function graph(): AgencyData {
  return {
    agency: null,
    excursions: [
      {
        id: "trip",
        agencyId: "agency",
        destination: "Aparecida",
        originCity: "Taubaté",
        departureAt: "2026-10-17T07:00:00-03:00",
        returnAt: "2026-10-18T20:00:00-03:00",
        vehicleCapacity: 4,
        vehicleLabel: null,
        status: "open",
        notes: null,
        createdAt: "",
        updatedAt: "",
      },
    ],
    boardingPoints: [
      {
        id: "point",
        excursionId: "trip",
        name: "Taubaté",
        address: null,
        departAt: null,
        sortOrder: 0,
        notes: null,
        createdAt: "",
      },
    ],
    passengers: [passenger("maria", "trip")],
    seats: coach(),
    installments: [
      {
        id: "parcel",
        passengerId: "maria",
        excursionId: "trip",
        sequence: 1,
        label: null,
        amountCents: 15000,
        dueDate: "2026-10-10",
        status: "pending",
        paidAt: null,
        paymentMethod: null,
        notes: null,
        createdAt: "",
        updatedAt: "",
      },
    ],
    rooms: [
      {
        id: "room",
        excursionId: "trip",
        label: "1",
        roomType: "single",
        capacity: 1,
        notes: null,
        createdAt: "",
      },
    ],
    roomAssignments: [
      {
        id: "assign",
        roomId: "room",
        passengerId: "maria",
        createdAt: "",
      },
    ],
  };
}

function passenger(id: string, excursionId: string): Passenger {
  return {
    id,
    excursionId,
    boardingPointId: excursionId === "trip" ? "point" : null,
    fullName: id,
    documentType: "cpf",
    documentNumber: "90000000001",
    documentIssuer: "SSP/SP",
    phone: null,
    email: null,
    status: "confirmed",
    notes: null,
    createdAt: "",
    updatedAt: "",
  };
}

function coach(): Seat[] {
  const slots: Array<[Seat["side"], Seat["position"]]> = [
    ["left", "window"],
    ["left", "aisle"],
    ["right", "aisle"],
    ["right", "window"],
  ];
  return slots.map(([side, position], index) => ({
    id: `seat-${index + 1}`,
    excursionId: "trip",
    seatNumber: index + 1,
    rowIndex: 1,
    side,
    position,
    status: index === 0 ? "occupied" : index === 3 ? "blocked" : "available",
    passengerId: index === 0 ? "maria" : null,
    notes: null,
    createdAt: "",
    updatedAt: "",
  }));
}
