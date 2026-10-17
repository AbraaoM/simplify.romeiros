import { describe, expect, test } from "vitest";
import {
  buildCoachLayout,
  excursionSchedule,
  normalizeDocument,
  parseBoardingNames,
  parseMoney,
  planCancelPassenger,
  planMarkPaid,
  planNewInstallment,
  planSeatChange,
  requireName,
} from "./commands";
import type { InstallmentStatus, PassengerStatus, SeatStatus } from "./types";

function seat(
  id: string,
  status: SeatStatus,
  passengerId: string | null,
) {
  return { id, status, passengerId, excursionId: "exc" };
}

function person(id: string, status: PassengerStatus = "reserved") {
  return { id, excursionId: "exc", status };
}

describe("buildCoachLayout", () => {
  test("builds a 2+2 coach in the fixture order", () => {
    const result = buildCoachLayout(8);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.seats).toHaveLength(8);
    expect(result.seats[0]).toMatchObject({
      seatNumber: 1,
      rowIndex: 1,
      side: "left",
      position: "window",
    });
    expect(result.seats[1]).toMatchObject({
      seatNumber: 2,
      side: "left",
      position: "aisle",
    });
    expect(result.seats[2]).toMatchObject({
      seatNumber: 3,
      side: "right",
      position: "aisle",
    });
    expect(result.seats[3]).toMatchObject({
      seatNumber: 4,
      side: "right",
      position: "window",
    });
    expect(result.seats[4]).toMatchObject({ seatNumber: 5, rowIndex: 2 });
  });

  test("rejects a capacity that is not a 2+2 coach", () => {
    expect(buildCoachLayout(46).ok).toBe(false);
    expect(buildCoachLayout(3).ok).toBe(false);
    expect(buildCoachLayout(84).ok).toBe(false);
    expect(buildCoachLayout(0).ok).toBe(false);
  });
});

describe("excursionSchedule", () => {
  test("stores departure at 08:00 and return at 18:00 in São Paulo", () => {
    const result = excursionSchedule("2026-10-17", "2026-10-18");
    expect(result).toEqual({
      ok: true,
      departureAt: "2026-10-17T08:00:00-03:00",
      returnAt: "2026-10-18T18:00:00-03:00",
    });
  });

  test("allows a one-day trip and an open return", () => {
    expect(excursionSchedule("2026-10-17", "2026-10-17").ok).toBe(true);
    expect(excursionSchedule("2026-10-17", "").ok).toBe(true);
    const open = excursionSchedule("2026-10-17", "");
    if (open.ok) expect(open.returnAt).toBeNull();
  });

  test("rejects a return before the departure day", () => {
    const result = excursionSchedule("2026-10-18", "2026-10-17");
    expect(result.ok).toBe(false);
  });

  test("rejects a missing or impossible day", () => {
    expect(excursionSchedule("", null).ok).toBe(false);
    expect(excursionSchedule("2026-02-31", null).ok).toBe(false);
  });
});

describe("parseMoney", () => {
  test("reads reais with a comma or a plain number", () => {
    expect(parseMoney("150")).toEqual({ ok: true, cents: 15000 });
    expect(parseMoney("150,00")).toEqual({ ok: true, cents: 15000 });
    expect(parseMoney("1.234,56")).toEqual({ ok: true, cents: 123456 });
    expect(parseMoney("0")).toEqual({ ok: true, cents: 0 });
  });

  test("rejects an empty or malformed amount", () => {
    expect(parseMoney("").ok).toBe(false);
    expect(parseMoney("150.00").ok).toBe(false);
    expect(parseMoney("-1").ok).toBe(false);
  });
});

describe("normalizeDocument", () => {
  test("keeps an 11-digit CPF and drops the mask", () => {
    expect(normalizeDocument("cpf", "900.000.000-01")).toEqual({
      ok: true,
      number: "90000000001",
    });
  });

  test("allows an empty document", () => {
    expect(normalizeDocument("cpf", "")).toEqual({ ok: true, number: null });
    expect(normalizeDocument("rg", "  ")).toEqual({ ok: true, number: null });
  });

  test("rejects a CPF that is not 11 digits", () => {
    expect(normalizeDocument("cpf", "123").ok).toBe(false);
  });
});

describe("parseBoardingNames", () => {
  test("keeps one trimmed name per line and drops blanks", () => {
    expect(parseBoardingNames(" Taubaté \n\nPindamonhangaba\nTaubaté")).toEqual([
      "Taubaté",
      "Pindamonhangaba",
    ]);
  });
});

describe("requireName", () => {
  test("trims a present name and rejects a blank one", () => {
    expect(requireName("  Maria Souza  ")).toEqual({
      ok: true,
      name: "Maria Souza",
    });
    expect(requireName("   ").ok).toBe(false);
  });
});

describe("planSeatChange", () => {
  const seats = [
    seat("s1", "available", null),
    seat("s2", "occupied", "p1"),
    seat("s3", "blocked", null),
  ];
  const passengers = [person("p1"), person("p2"), person("p3", "cancelled")];

  test("sits a free passenger on a free seat", () => {
    expect(
      planSeatChange(seats, passengers, {
        type: "assign",
        seatId: "s1",
        passengerId: "p2",
      }),
    ).toEqual({
      ok: true,
      writes: [{ seatId: "s1", status: "occupied", passengerId: "p2" }],
    });
  });

  test("moves a passenger and frees the previous seat", () => {
    expect(
      planSeatChange(seats, passengers, {
        type: "assign",
        seatId: "s1",
        passengerId: "p1",
      }),
    ).toEqual({
      ok: true,
      writes: [
        { seatId: "s2", status: "available", passengerId: null },
        { seatId: "s1", status: "occupied", passengerId: "p1" },
      ],
    });
  });

  test("refuses a blocked seat, a taken seat, and a cancelled passenger", () => {
    expect(
      planSeatChange(seats, passengers, {
        type: "assign",
        seatId: "s3",
        passengerId: "p2",
      }).ok,
    ).toBe(false);
    expect(
      planSeatChange(seats, passengers, {
        type: "assign",
        seatId: "s2",
        passengerId: "p2",
      }).ok,
    ).toBe(false);
    expect(
      planSeatChange(seats, passengers, {
        type: "assign",
        seatId: "s1",
        passengerId: "p3",
      }).ok,
    ).toBe(false);
  });

  test("releases an occupied seat", () => {
    expect(
      planSeatChange(seats, passengers, { type: "release", seatId: "s2" }),
    ).toEqual({
      ok: true,
      writes: [{ seatId: "s2", status: "available", passengerId: null }],
    });
  });

  test("refuses to release a free seat", () => {
    expect(
      planSeatChange(seats, passengers, { type: "release", seatId: "s1" }).ok,
    ).toBe(false);
  });
});

describe("planCancelPassenger", () => {
  test("frees the seat and leaves installments alone", () => {
    expect(
      planCancelPassenger(person("p1"), [seat("s2", "occupied", "p1")]),
    ).toEqual({ ok: true, seatIdToRelease: "s2" });
  });

  test("cancels a passenger who has no seat", () => {
    expect(planCancelPassenger(person("p2"), [])).toEqual({
      ok: true,
      seatIdToRelease: null,
    });
  });

  test("refuses a passenger who is already cancelled", () => {
    expect(planCancelPassenger(person("p3", "cancelled"), []).ok).toBe(false);
  });
});

describe("planMarkPaid", () => {
  test("marks only a pending installment", () => {
    expect(planMarkPaid("pending")).toEqual({ ok: true });
    for (const status of ["paid", "waived", "cancelled"] as InstallmentStatus[]) {
      expect(planMarkPaid(status).ok).toBe(false);
    }
    expect(planMarkPaid(null).ok).toBe(false);
  });
});

describe("planNewInstallment", () => {
  test("uses the next sequence", () => {
    expect(planNewInstallment("150,00", "2026-10-20", [1, 2])).toEqual({
      ok: true,
      amountCents: 15000,
      dueDate: "2026-10-20",
      sequence: 3,
    });
  });

  test("starts at 1 when the passenger has no installments", () => {
    const result = planNewInstallment("80", "2026-11-01", []);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.sequence).toBe(1);
  });

  test("rejects a missing due date", () => {
    expect(planNewInstallment("80", "", []).ok).toBe(false);
  });
});
