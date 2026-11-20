import { describe, expect, test } from "vitest";
import {
  ANTT_DISCLAIMER,
  anttPassengersCsv,
  anttPassengersPdf,
  passengerExportRows,
  passengersCsv,
  passengersPdf,
} from "./export-lists";
import type { BoardingPoint, Passenger, Seat } from "./types";

const passengers: Passenger[] = [
  person("a", "Ana Lima", "52998224725", "bp-1", "reserved"),
  person("b", "Bruno Nunes", null, null, "cancelled"),
  person("c", "Carla Dias", "11144477735", "bp-2", "confirmed"),
];

const seats: Seat[] = [
  seat("s1", 4, "c"),
  seat("s2", 1, "a"),
];

const points: BoardingPoint[] = [
  point("bp-1", "Taubaté"),
  point("bp-2", "Centro"),
];

describe("passenger lists", () => {
  test("drops cancelled passengers and sorts by seat", () => {
    const rows = passengerExportRows(passengers, seats, points);
    expect(rows.map((row) => row.fullName)).toEqual(["Ana Lima", "Carla Dias"]);
    expect(rows[0]?.seatNumber).toBe(1);
    expect(rows[0]?.boardingPointName).toBe("Taubaté");
  });

  test("builds a semicolon CSV with a UTF-8 BOM for Excel", () => {
    const rows = passengerExportRows(passengers, seats, points);
    const csv = passengersCsv(rows);
    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csv).toContain("Nome;Documento;Poltrona;Telefone;Ponto de embarque;Observações");
    expect(csv).toContain("Ana Lima;529.982.247-25;1;");
    expect(csv).not.toContain("Bruno Nunes");
  });

  test("builds the compact ANTT list without claiming to replace licensing", () => {
    const rows = passengerExportRows(passengers, seats, points);
    const csv = anttPassengersCsv(rows);
    expect(csv).toContain("Nome;Documento;Poltrona");
    expect(csv).not.toContain("Telefone");
    const pdf = new TextDecoder("latin1").decode(anttPassengersPdf("Lista ANTT", "Aparecida", rows));
    expect(pdf).toContain("PDF-1.4");
    expect(pdf).toContain(ANTT_DISCLAIMER);
    expect(new TextDecoder("latin1").decode(passengersPdf("Lista", "Aparecida", rows))).toContain("Ana Lima");
  });
});

function person(
  id: string,
  fullName: string,
  documentNumber: string | null,
  boardingPointId: string | null,
  status: Passenger["status"],
): Passenger {
  return {
    id,
    excursionId: "ex",
    boardingPointId,
    fullName,
    documentType: "cpf",
    documentNumber,
    documentIssuer: null,
    phone: id === "a" ? "+5512981660131" : null,
    email: null,
    status,
    notes: null,
    createdAt: "2026-11-20T12:00:00.000Z",
    updatedAt: "2026-11-20T12:00:00.000Z",
  };
}

function seat(id: string, seatNumber: number, passengerId: string): Seat {
  return {
    id,
    excursionId: "ex",
    seatNumber,
    rowIndex: 1,
    side: "left",
    position: "window",
    status: "occupied",
    passengerId,
    notes: null,
    createdAt: "2026-11-20T12:00:00.000Z",
    updatedAt: "2026-11-20T12:00:00.000Z",
  };
}

function point(id: string, name: string): BoardingPoint {
  return {
    id,
    excursionId: "ex",
    name,
    address: null,
    departAt: null,
    sortOrder: 0,
    notes: null,
    createdAt: "2026-11-20T12:00:00.000Z",
  };
}
