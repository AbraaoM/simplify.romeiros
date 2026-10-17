import type { Installment, PaymentStanding } from "./types";

export function paymentStanding(
  installments: Pick<Installment, "status" | "dueDate">[],
  today: string,
): PaymentStanding {
  const pending = installments.filter((item) => item.status === "pending");
  if (pending.some((item) => item.dueDate < today)) return "overdue";
  if (pending.some((item) => item.dueDate === today)) return "due_today";
  if (pending.length > 0) return "pending";
  return "settled";
}
