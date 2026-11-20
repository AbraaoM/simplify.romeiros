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


export type SeatMapMode = "coach_2_2" | "van_15" | "list";

export function detectMapMode(
  seats: Array<Pick<Seat, "rowIndex" | "side" | "position">>,
): SeatMapMode {
  if (isCoachMap(seats)) return "coach_2_2";
  if (isVan15(seats)) return "van_15";
  return "list";
}

/** 2+2 rows, optionally with a last row of the two window seats (46/50). */
export function isCoachMap(
  seats: Array<Pick<Seat, "rowIndex" | "side" | "position">>,
): boolean {
  if (seats.length === 0) return false;
  const rows = groupRows(seats);
  const indexes = [...rows.keys()].sort((a, b) => a - b);
  if (indexes[0] !== 1) return false;
  for (let index = 0; index < indexes.length; index += 1) {
    if (indexes[index] !== index + 1) return false;
    const row = rows.get(indexes[index]) ?? [];
    const last = index === indexes.length - 1;
    if (isFullCoachRow(row)) continue;
    if (last && isPartialCoachRow(row)) continue;
    return false;
  }
  return true;
}

function isVan15(
  seats: Array<Pick<Seat, "rowIndex" | "side" | "position">>,
): boolean {
  if (seats.length === 0 || seats.length % 3 !== 0) return false;
  const rows = groupRows(seats);
  const indexes = [...rows.keys()].sort((a, b) => a - b);
  if (indexes[0] !== 1) return false;
  for (let index = 0; index < indexes.length; index += 1) {
    if (indexes[index] !== index + 1) return false;
    const row = rows.get(indexes[index]) ?? [];
    if (row.length !== 3) return false;
    const keys = new Set(row.map((seat) => `${seat.side}:${seat.position}`));
    if (
      keys.size !== 3 ||
      !keys.has("left:window") ||
      !keys.has("center:middle") ||
      !keys.has("right:window")
    ) {
      return false;
    }
  }
  return true;
}

function groupRows(
  seats: Array<Pick<Seat, "rowIndex" | "side" | "position">>,
) {
  const rows = new Map<number, Array<Pick<Seat, "side" | "position">>>();
  for (const seat of seats) {
    const row = rows.get(seat.rowIndex) ?? [];
    row.push(seat);
    rows.set(seat.rowIndex, row);
  }
  return rows;
}

function isFullCoachRow(row: Array<Pick<Seat, "side" | "position">>): boolean {
  if (row.length !== 4) return false;
  const keys = new Set(row.map((seat) => `${seat.side}:${seat.position}`));
  return (
    keys.size === 4 &&
    keys.has("left:window") &&
    keys.has("left:aisle") &&
    keys.has("right:aisle") &&
    keys.has("right:window")
  );
}

function isPartialCoachRow(row: Array<Pick<Seat, "side" | "position">>): boolean {
  if (row.length !== 2) return false;
  const keys = new Set(row.map((seat) => `${seat.side}:${seat.position}`));
  return keys.size === 2 && keys.has("left:window") && keys.has("right:window");
}
