import Link from "next/link";
import { formatExcursionRange } from "@/lib/domain/dates";
import { overdueLabel, paidLabel } from "@/lib/format/labels";
import type { TripSummary } from "@/lib/services/views";

export function TripList({ trips }: { trips: TripSummary[] }) {
  return (
    <ul className="mt-2">
      {trips.map((trip) => (
        <li key={trip.id} className="border-b border-line dark:border-line-dark">
          <Link
            href={`/excursoes/${trip.id}`}
            className="block py-5 transition-colors duration-300 hover:bg-paper-soft dark:hover:bg-ink-soft"
          >
            <span className="block font-display text-4xl leading-[0.9]">
              {trip.destination}
            </span>
            <span className="mt-2 block text-sm text-muted dark:text-faint">
              {formatExcursionRange(trip.departureAt, trip.returnAt)} ·{" "}
              {trip.occupied}/{trip.capacity}
            </span>
            <span className="mt-2 block text-sm">
              {paidLabel(trip.paid)} · {trip.open} a receber ·{" "}
              <span
                className={
                  trip.overdue > 0 ? "text-danger dark:text-danger-soft" : undefined
                }
              >
                {overdueLabel(trip.overdue)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
