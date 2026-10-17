import { describe, expect, test } from "vitest";
import {
  addDays,
  calendarDateInBrazil,
  formatExcursionRange,
  nextSaturdayOnOrAfter,
  todayInBrazil,
} from "./dates";

describe("todayInBrazil", () => {
  test("uses the previous calendar day before midnight in São Paulo", () => {
    expect(todayInBrazil(new Date("2026-10-16T02:30:00.000Z"))).toBe(
      "2026-10-15",
    );
  });

  test("rolls to the new day at midnight in São Paulo", () => {
    expect(todayInBrazil(new Date("2026-10-16T03:00:00.000Z"))).toBe(
      "2026-10-16",
    );
  });
});

describe("calendar dates", () => {
  test("adds days without shifting the calendar date", () => {
    expect(addDays("2026-10-16", 5)).toBe("2026-10-21");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  test("finds the Saturday on or after a date", () => {
    expect(nextSaturdayOnOrAfter("2026-10-16")).toBe("2026-10-17");
    expect(nextSaturdayOnOrAfter("2026-10-17")).toBe("2026-10-17");
  });

  test("reads a timestamp on the São Paulo calendar", () => {
    expect(calendarDateInBrazil("2026-10-17T02:30:00.000Z")).toBe("2026-10-16");
  });

  test("formats a same-month trip as a day range", () => {
    expect(
      formatExcursionRange(
        "2026-10-17T07:00:00-03:00",
        "2026-10-18T20:00:00-03:00",
      ),
    ).toBe("17–18 out");
  });

  test("formats a cross-month trip with both months", () => {
    expect(
      formatExcursionRange(
        "2026-10-31T07:00:00-03:00",
        "2026-11-02T20:00:00-03:00",
      ),
    ).toBe("31 out–2 nov");
  });
});
