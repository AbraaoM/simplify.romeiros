import Link from "next/link";
import { formatDayMonth } from "@/lib/domain/dates";
import { formatBrl } from "@/lib/format/money";
import { StandingMark } from "@/components/ui/standing-mark";
import type { AttentionItem } from "@/lib/services/views";

export function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li
          key={item.installmentId}
          className="border-b border-line dark:border-line-dark"
        >
          <Link
            href={`/excursoes/${item.excursionId}`}
            className="block py-4 transition-colors duration-300 hover:bg-paper-soft dark:hover:bg-ink-soft"
          >
            <span className="flex items-baseline justify-between gap-4">
              <span>{item.passengerName}</span>
              <span>{formatBrl(item.amountCents)}</span>
            </span>
            <span className="mt-1 block text-sm text-muted dark:text-faint">
              {item.destination}
              {item.seatNumber ? ` · Poltrona ${item.seatNumber}` : ""}
              {` · ${formatDayMonth(item.dueDate)}`}
            </span>
            <span className="mt-2 block text-sm">
              <StandingMark standing={item.standing} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
