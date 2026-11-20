import type { SeatPosition, SeatSide, VehicleLayout } from "./types";
import { buildCoachLayout, type CoachSeat, type CommandResult } from "./commands";

export type VehicleSeat = CoachSeat & { layout: VehicleLayout };

const COACH_SLOTS: Array<[SeatSide, SeatPosition]> = [
  ["left", "window"],
  ["left", "aisle"],
  ["right", "aisle"],
  ["right", "window"],
];

const VAN_SLOTS: Array<[SeatSide, SeatPosition]> = [
  ["left", "window"],
  ["center", "middle"],
  ["right", "window"],
];

const LAYOUT_CAPACITY: Record<VehicleLayout, number> = {
  coach_2_2: 0,
  coach_46: 46,
  coach_50: 50,
  van_15: 15,
};

export const VEHICLE_LAYOUT_OPTIONS: Array<{
  layout: VehicleLayout;
  capacity: number;
  label: string;
}> = [
  { layout: "van_15", capacity: 15, label: "Van (15 lugares)" },
  { layout: "coach_46", capacity: 46, label: "Ônibus convencional (46 lugares)" },
  { layout: "coach_50", capacity: 50, label: "Ônibus convencional (50 lugares)" },
];

export function layoutFromCapacity(capacity: number): VehicleLayout | null {
  if (capacity === 15) return "van_15";
  if (capacity === 46) return "coach_46";
  if (capacity === 50) return "coach_50";
  if (Number.isInteger(capacity) && capacity >= 4 && capacity <= 80 && capacity % 4 === 0) {
    return "coach_2_2";
  }
  return null;
}

export function buildVehicleLayout(
  layout: VehicleLayout,
  capacity?: number,
): CommandResult<{ seats: CoachSeat[]; layout: VehicleLayout; capacity: number }> {
  if (layout === "coach_2_2") {
    const coach = buildCoachLayout(capacity ?? 0);
    if (!coach.ok) return coach;
    return { ok: true, seats: coach.seats, layout, capacity: coach.seats.length };
  }

  if (layout === "van_15") {
    return {
      ok: true,
      layout,
      capacity: 15,
      seats: fillRows(5, VAN_SLOTS),
    };
  }

  if (layout === "coach_46" || layout === "coach_50") {
    const fullRows = layout === "coach_46" ? 11 : 12;
    const seats = fillRows(fullRows, COACH_SLOTS);
    const lastRow = fullRows + 1;
    seats.push(
      { seatNumber: seats.length + 1, rowIndex: lastRow, side: "left", position: "window" },
      { seatNumber: seats.length + 2, rowIndex: lastRow, side: "right", position: "window" },
    );
    return { ok: true, seats, layout, capacity: LAYOUT_CAPACITY[layout] };
  }

  return { ok: false, message: "Escolha o tipo de veículo." };
}

export function buildLayoutFromCapacity(
  capacity: number,
): CommandResult<{ seats: CoachSeat[]; layout: VehicleLayout; capacity: number }> {
  const layout = layoutFromCapacity(capacity);
  if (!layout) {
    return {
      ok: false,
      message:
        "Escolha 15 (van), 46 ou 50 (ônibus convencional), ou um múltiplo de 4 entre 4 e 80.",
    };
  }
  return buildVehicleLayout(layout, capacity);
}

function fillRows(
  rowCount: number,
  slots: Array<[SeatSide, SeatPosition]>,
): CoachSeat[] {
  const seats: CoachSeat[] = [];
  let seatNumber = 0;
  for (let rowIndex = 1; rowIndex <= rowCount; rowIndex += 1) {
    for (const [side, position] of slots) {
      seatNumber += 1;
      seats.push({ seatNumber, rowIndex, side, position });
    }
  }
  return seats;
}
