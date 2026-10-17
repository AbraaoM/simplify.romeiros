import { describe, expect, test } from "vitest";
import { paymentStanding } from "./payment-standing";
import type { Installment } from "./types";

const today = "2026-10-16";

function parcel(
  status: Installment["status"],
  dueDate: string,
): Pick<Installment, "status" | "dueDate"> {
  return { status, dueDate };
}

describe("paymentStanding", () => {
  test("marks a pending installment from yesterday as overdue", () => {
    expect(paymentStanding([parcel("pending", "2026-10-15")], today)).toBe(
      "overdue",
    );
  });

  test("does not treat an installment due today as overdue", () => {
    expect(paymentStanding([parcel("pending", today)], today)).toBe("due_today");
  });

  test("keeps a future pending installment as pending", () => {
    expect(paymentStanding([parcel("pending", "2026-10-20")], today)).toBe(
      "pending",
    );
  });

  test("settles when every installment is paid", () => {
    expect(paymentStanding([parcel("paid", "2026-10-01")], today)).toBe(
      "settled",
    );
  });

  test("treats waived as settled and ignores cancelled", () => {
    expect(
      paymentStanding(
        [parcel("waived", "2026-10-01"), parcel("cancelled", "2026-10-01")],
        today,
      ),
    ).toBe("settled");
  });

  test("settles when there are no installments", () => {
    expect(paymentStanding([], today)).toBe("settled");
  });

  test("lets overdue win over an installment due today", () => {
    expect(
      paymentStanding(
        [parcel("pending", today), parcel("pending", "2026-10-10")],
        today,
      ),
    ).toBe("overdue");
  });

  test("lets due today win over a future installment", () => {
    expect(
      paymentStanding(
        [parcel("pending", "2026-11-01"), parcel("pending", today)],
        today,
      ),
    ).toBe("due_today");
  });
});
