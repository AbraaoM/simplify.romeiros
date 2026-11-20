import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReleaseSeatForm, SeatAssignForm } from "@/components/forms/seat-form";
import { ErrorState } from "@/components/ui/error-state";
import { getSeatPage } from "@/lib/services/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Poltrona — Simplify" };

export default async function SeatPage({
  params,
}: {
  params: Promise<{ id: string; seatId: string }>;
}) {
  const { id, seatId } = await params;
  const result = await getSeatPage(id, seatId);
  if (!result.ok) {
    return <ErrorState message="Não foi possível carregar esta poltrona." />;
  }
  if (!result.data) notFound();

  const page = result.data;
  const writable = result.source === "database";
  const blocked = page.seat.status === "blocked";

  return (
    <article>
      <p className="text-sm text-muted dark:text-faint">{page.destination}</p>
      <h1 className="mt-2 font-display text-5xl leading-[0.9]">
        Poltrona {page.seat.seatNumber}
      </h1>
      <p className="mt-3">
        {blocked
          ? "Bloqueada"
          : page.passengerName
            ? page.passengerName
            : "Livre"}
      </p>
      {writable && !blocked && page.passengerName ? (
        <ReleaseSeatForm excursionId={id} seatId={seatId} />
      ) : null}
      {writable && !blocked && page.choices.length > 0 ? (
        <SeatAssignForm excursionId={id} seatId={seatId} choices={page.choices} />
      ) : null}
      {writable && !blocked && page.choices.length === 0 && !page.passengerName ? (
        <p className="mt-6">Nenhum passageiro para sentar.</p>
      ) : null}
      {!writable ? <p className="mt-6">O banco não está ligado.</p> : null}
      <p className="mt-8">
        <Link href={`/excursoes/${id}`} className="inline-flex min-h-11 items-center">
          Voltar à excursão
        </Link>
      </p>
    </article>
  );
}
