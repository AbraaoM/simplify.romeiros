import Link from "next/link";
import { STANDING_LABEL } from "@/lib/format/labels";
import type { SeatView } from "@/lib/services/views";
import type { SeatPosition, SeatSide } from "@/lib/domain/types";

export function SeatMap({
  seats,
  mode,
  excursionId,
}: {
  seats: SeatView[];
  mode: "coach_2_2" | "list";
  excursionId?: string;
}) {
  return (
    <div>
      {mode === "coach_2_2" ? (
        <Coach seats={seats} excursionId={excursionId} />
      ) : (
        <Numbered seats={seats} excursionId={excursionId} />
      )}
      <ul className="mt-4 space-y-1 text-sm text-muted dark:text-faint">
        <li>Preenchida, ocupada.</li>
        <li>Contorno, livre.</li>
        <li>Cinza, bloqueada.</li>
        <li>Ponto vermelho, parcela atrasada.</li>
        <li>Ponto âmbar, vence hoje.</li>
      </ul>
    </div>
  );
}

function Coach({
  seats,
  excursionId,
}: {
  seats: SeatView[];
  excursionId?: string;
}) {
  const rows = new Map<number, SeatView[]>();
  for (const seat of seats) {
    const row = rows.get(seat.rowIndex) ?? [];
    row.push(seat);
    rows.set(seat.rowIndex, row);
  }

  return (
    <ol className="flex flex-col gap-1" aria-label="Mapa de poltronas">
      {[...rows.keys()]
        .sort((a, b) => a - b)
        .map((index) => {
          const row = rows.get(index) ?? [];
          return (
            <li key={index} className="flex items-center gap-1">
              <SeatCell seat={findSeat(row, "left", "window")} excursionId={excursionId} />
              <SeatCell seat={findSeat(row, "left", "aisle")} excursionId={excursionId} />
              <span className="w-5 shrink-0" aria-hidden="true" />
              <SeatCell seat={findSeat(row, "right", "aisle")} excursionId={excursionId} />
              <SeatCell seat={findSeat(row, "right", "window")} excursionId={excursionId} />
            </li>
          );
        })}
    </ol>
  );
}

function Numbered({
  seats,
  excursionId,
}: {
  seats: SeatView[];
  excursionId?: string;
}) {
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Poltronas">
      {seats.map((seat) => (
        <li key={seat.id}>
          <SeatCell seat={seat} excursionId={excursionId} />
        </li>
      ))}
    </ol>
  );
}

function findSeat(row: SeatView[], side: SeatSide, position: SeatPosition) {
  return row.find((seat) => seat.side === side && seat.position === position);
}

function SeatCell({
  seat,
  excursionId,
}: {
  seat: SeatView | undefined;
  excursionId?: string;
}) {
  if (!seat) return <span className="size-11" />;

  const standing =
    seat.standing === "overdue" || seat.standing === "due_today"
      ? seat.standing
      : null;
  const state =
    seat.status === "occupied"
      ? "ocupada"
      : seat.status === "blocked"
        ? "bloqueada"
        : "livre";
  const person = seat.passengerName ? `, ${seat.passengerName}` : "";
  const money = standing ? `, ${STANDING_LABEL[standing]}` : "";
  const tone =
    seat.status === "occupied"
      ? "bg-ink text-paper dark:bg-paper dark:text-ink"
      : seat.status === "blocked"
        ? "bg-line text-muted dark:bg-line-dark dark:text-faint"
        : "border border-ink text-ink dark:border-paper dark:text-paper";

  const className = `relative flex size-11 items-center justify-center text-xs ${tone}`;
  const label = `Poltrona ${seat.seatNumber}, ${state}${person}${money}`;
  const mark = standing ? (
    <span
      className={`absolute top-0.5 right-0.5 size-1.5 ${
        standing === "overdue"
          ? "bg-danger dark:bg-danger-soft"
          : "bg-accent dark:bg-accent-light"
      }`}
    />
  ) : null;

  if (excursionId) {
    return (
      <Link
        href={`/excursoes/${excursionId}/poltronas/${seat.id}`}
        aria-label={label}
        className={className}
      >
        {seat.seatNumber}
        {mark}
      </Link>
    );
  }

  return (
    <span role="img" aria-label={label} className={className}>
      {seat.seatNumber}
      {mark}
    </span>
  );
}
