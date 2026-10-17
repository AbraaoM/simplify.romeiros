import { describe, expect, test } from "vitest";
import { canAssignPassengerToSeat, isCoach22, occupancy } from "./seats";
import type { Seat } from "./types";

describe("occupancy", () => {
  test("counts occupied seats against capacity", () => {
    expect(
      occupancy([{ status: "occupied" }, { status: "available" }], 2),
    ).toEqual({
      occupied: 1,
      capacity: 2,
      seatCount: 2,
      matchesCapacity: true,
      overCapacity: false,
    });
  });

  test("flags more occupied seats than the vehicle allows", () => {
    expect(
      occupancy([{ status: "occupied" }, { status: "occupied" }], 1).overCapacity,
    ).toBe(true);
  });
});

describe("canAssignPassengerToSeat", () => {
  const seats = [
    { id: "free", status: "available" as const, passengerId: null },
    { id: "blocked", status: "blocked" as const, passengerId: null },
    { id: "taken", status: "occupied" as const, passengerId: "ana" },
  ];

  test("allows a free passenger on a free seat", () => {
    expect(canAssignPassengerToSeat(seats, "free", "bruno")).toBe(true);
  });

  test("rejects a blocked seat", () => {
    expect(canAssignPassengerToSeat(seats, "blocked", "bruno")).toBe(false);
  });

  test("rejects a seat occupied by someone else", () => {
    expect(canAssignPassengerToSeat(seats, "taken", "bruno")).toBe(false);
  });

  test("rejects a second seat for the same passenger", () => {
    expect(canAssignPassengerToSeat(seats, "free", "ana")).toBe(false);
  });

  test("keeps the passenger on the seat they already have", () => {
    expect(canAssignPassengerToSeat(seats, "taken", "ana")).toBe(true);
  });

  test("rejects an unknown seat", () => {
    expect(canAssignPassengerToSeat(seats, "missing", "bruno")).toBe(false);
  });
});

describe("isCoach22", () => {
  test("accepts one complete row of window and aisle seats", () => {
    expect(isCoach22(coachRow(1))).toBe(true);
  });

  test("rejects a row that is missing a seat", () => {
    expect(isCoach22(coachRow(1).slice(0, 3))).toBe(false);
  });
});

function coachRow(rowIndex: number): Pick<Seat, "rowIndex" | "side" | "position">[] {
  return [
    { rowIndex, side: "left", position: "window" },
    { rowIndex, side: "left", position: "aisle" },
    { rowIndex, side: "right", position: "aisle" },
    { rowIndex, side: "right", position: "window" },
  ];
}
