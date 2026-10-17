import { calendarDateInBrazil, formatDayMonth } from "@/lib/domain/dates";
import { dueTodayHeadline, overdueHeadline } from "@/lib/format/labels";
import type { DashboardHeadline } from "@/lib/services/views";

export function Headline({ headline }: { headline: DashboardHeadline }) {
  if (headline.kind === "overdue" || headline.kind === "due_today") {
    const label =
      headline.kind === "overdue"
        ? overdueHeadline(headline.count)
        : dueTodayHeadline(headline.count);
    return (
      <div>
        <h1 className="font-display text-7xl leading-none sm:text-8xl">
          {headline.count}
        </h1>
        <p className="mt-3 text-lg">{label}</p>
      </div>
    );
  }

  if (headline.kind === "next_departure") {
    return (
      <div>
        <h1 className="font-display text-5xl leading-[0.9] sm:text-7xl">
          {headline.destination}
        </h1>
        <p className="mt-3 text-lg">
          sai {formatDayMonth(calendarDateInBrazil(headline.departureAt))}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="max-w-md font-display text-5xl leading-[0.9] sm:text-6xl">
        Nenhuma excursão aberta.
      </h1>
      <p className="mt-4 max-w-md text-muted dark:text-faint">
        Quando houver uma viagem ativa, ela aparece aqui.
      </p>
    </div>
  );
}
