import type { PaymentStanding } from "@/lib/domain/types";
import { STANDING_LABEL } from "@/lib/format/labels";

const DOT: Record<PaymentStanding, string> = {
  overdue: "bg-danger dark:bg-danger-soft",
  due_today: "bg-accent dark:bg-accent-light",
  pending: "bg-muted dark:bg-faint",
  settled: "bg-ok dark:bg-ok-soft",
};

export function StandingMark({ standing }: { standing: PaymentStanding }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-2 ${DOT[standing]}`} aria-hidden="true" />
      {STANDING_LABEL[standing]}
    </span>
  );
}
