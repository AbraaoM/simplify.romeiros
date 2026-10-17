import type { Seat, SeatSide, SeatPosition } from "./types";

const SIDES: SeatSide[] = ["left", "right"];
const POSITIONS: SeatPosition[] = ["window", "aisle"];

export function occupancy(seats: Pick<Seat, "status">[], capacity: number) {
  const occupied = seats.filter((seat) => seat.status === "occupied").length;
  return {
    occupied,
    capacity,
    seatCount: seats.length,
    matchesCapacity: seats.length === capacity,
    overCapacity: occupied > capacity,
  };
}

export function canAssignPassengerToSeat(
  seats: Pick<Seat, "id" | "status" | "passengerId">[],
  seatId: string,
  passengerId: string,
): boolean {
  const seat = seats.find((item) => item.id === seatId);
  if (!seat || seat.status === "blocked") return false;
  if (seat.passengerId && seat.passengerId !== passengerId) return false;
  return !seats.some(
    (item) => item.id !== seatId && item.passengerId === passengerId,
  );
}

export function isCoach22(seats: Pick<Seat, "rowIndex" | "side" | "position">[]): boolean {
  if (seats.length === 0 || seats.length % 4 !== 0) return false;

  const rows = new Map<number, Array<Pick<Seat, "side" | "position">>>();
  for (const seat of seats) {
    const row = rows.get(seat.rowIndex) ?? [];
    row.push(seat);
    rows.set(seat.rowIndex, row);
  }

  const indexes = [...rows.keys()].sort((a, b) => a - b);
  if (indexes[0] !== 1) return false;

  for (let index = 0; index < indexes.length; index += 1) {
    if (indexes[index] !== index + 1) return false;
    const row = rows.get(indexes[index]) ?? [];
    if (row.length !== 4) return false;
    const keys = new Set(row.map((seat) => `${seat.side}:${seat.position}`));
    if (keys.size !== 4) return false;
    for (const side of SIDES) {
      for (const position of POSITIONS) {
        if (!keys.has(`${side}:${position}`)) return false;
      }
    }
  }

  return true;
}
