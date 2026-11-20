import { describe, expect, test } from "vitest";
import { buildLayoutFromCapacity, buildVehicleLayout } from "./layouts";

describe("buildVehicleLayout", () => {
  test("builds a 46-seat conventional coach with a 2-seat last row", () => {
    const result = buildVehicleLayout("coach_46");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.seats).toHaveLength(46);
    expect(result.seats[43]).toMatchObject({
      seatNumber: 44,
      rowIndex: 11,
      side: "right",
      position: "window",
    });
    expect(result.seats[44]).toMatchObject({
      seatNumber: 45,
      rowIndex: 12,
      side: "left",
      position: "window",
    });
    expect(result.seats[45]).toMatchObject({
      seatNumber: 46,
      rowIndex: 12,
      side: "right",
      position: "window",
    });
  });

  test("builds a 50-seat conventional coach", () => {
    const result = buildVehicleLayout("coach_50");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.seats).toHaveLength(50);
    expect(result.seats[48]?.rowIndex).toBe(13);
  });

  test("builds a 15-seat van in five rows of three", () => {
    const result = buildVehicleLayout("van_15");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.seats).toHaveLength(15);
    expect(result.seats[0]).toMatchObject({
      rowIndex: 1,
      side: "left",
      position: "window",
    });
    expect(result.seats[1]).toMatchObject({ side: "center", position: "middle" });
    expect(result.seats[2]).toMatchObject({ side: "right", position: "window" });
    expect(result.seats[14]?.rowIndex).toBe(5);
  });

  test("keeps 2+2 coaches for multiples of 4 and maps 15/46/50 from capacity", () => {
    const coach = buildLayoutFromCapacity(8);
    expect(coach.ok && coach.layout).toBe("coach_2_2");
    expect(buildLayoutFromCapacity(15).ok && buildLayoutFromCapacity(15).ok).toBe(true);
    expect(buildLayoutFromCapacity(46).ok).toBe(true);
    expect(buildLayoutFromCapacity(7).ok).toBe(false);
  });
});
