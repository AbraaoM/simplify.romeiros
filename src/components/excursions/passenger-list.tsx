import Link from "next/link";
import { formatDocument } from "@/lib/format/document";
import { formatBrl } from "@/lib/format/money";
import { StandingMark } from "@/components/ui/standing-mark";
import type { PassengerRow } from "@/lib/services/views";

export function PassengerList({
  passengers,
  excursionId,
}: {
  passengers: PassengerRow[];
  excursionId?: string;
}) {
  if (passengers.length === 0) {
    return <p className="mt-4">Nenhum passageiro nesta excursão.</p>;
  }

  return (
    <ul className="mt-4">
      {passengers.map((passenger) => (
        <li
          key={passenger.id}
          className="border-b border-line py-4 dark:border-line-dark"
        >
          <div className="flex items-baseline justify-between gap-4">
            {excursionId ? (
              <Link
                href={`/excursoes/${excursionId}/passageiros/${passenger.id}`}
                className="inline-flex min-h-11 items-center"
              >
                {passenger.fullName}
              </Link>
            ) : (
              <p>{passenger.fullName}</p>
            )}
            <p className="font-display text-2xl leading-none">
              {passenger.seatNumber ?? "—"}
            </p>
          </div>
          <p className="mt-1 text-sm text-muted dark:text-faint">
            {formatDocument(passenger.documentType, passenger.documentNumber)}
            {passenger.documentIssuer ? ` · ${passenger.documentIssuer}` : ""}
          </p>
          <p className="mt-1 text-sm">
            {passenger.boardingPointName
              ? `Embarque ${passenger.boardingPointName}`
              : "Sem ponto de embarque"}
          </p>
          <p className="mt-2 text-sm">
            {passenger.status === "cancelled" ? (
              "Cancelado"
            ) : (
              <>
                <StandingMark standing={passenger.standing} />
                {passenger.nextAmountCents !== null
                  ? ` · ${formatBrl(passenger.nextAmountCents)}`
                  : ""}
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
