import Link from "next/link";
import { calendarDateInBrazil, formatExcursionRange } from "@/lib/domain/dates";
import { EXCURSION_STATUS_LABEL, overdueLabel, paidLabel } from "@/lib/format/labels";
import type { ExcursionView } from "@/lib/services/views";
import { BoardingForm } from "@/components/forms/boarding-form";
import { ExcursionSettingsForm } from "@/components/forms/excursion-form";
import { PrimaryLink } from "@/components/ui/primary-link";
import { PassengerList } from "./passenger-list";
import { RoomingList } from "./rooming-list";
import { SeatMap } from "./seat-map";

export function ExcursionDetail({
  view,
  writable,
}: {
  view: ExcursionView;
  writable: boolean;
}) {
  return (
    <article>
      <p className="text-sm text-muted dark:text-faint">
        {EXCURSION_STATUS_LABEL[view.status]}
      </p>
      <h1 className="mt-2 font-display text-5xl leading-[1.1] sm:text-7xl">
        {view.destination}
      </h1>
      <p className="mt-3">
        {formatExcursionRange(view.departureAt, view.returnAt)}
        {view.originCity ? ` · sai de ${view.originCity}` : ""}
      </p>
      <p className="mt-1 text-sm text-muted dark:text-faint">
        {view.occupied}/{view.vehicleCapacity} poltronas
        {view.vehicleLabel ? ` · ${view.vehicleLabel}` : ""}
      </p>
      <p className="mt-2 text-sm">
        {paidLabel(view.paid)} · {view.open} a receber ·{" "}
        <span
          className={
            view.overdue > 0 ? "text-danger dark:text-danger-soft" : undefined
          }
        >
          {overdueLabel(view.overdue)}
        </span>
      </p>
      {view.mapIncomplete ? (
        <p className="mt-6">Mapa de poltronas incompleto.</p>
      ) : null}
      <div className="mt-8 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-12">
        <SeatMap
          seats={view.seats}
          mode={view.mapMode}
          excursionId={writable ? view.id : undefined}
        />
        <div>
          <h2 className="font-display text-3xl leading-none">Passageiros</h2>
          {writable ? (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <PrimaryLink href={`/excursoes/${view.id}/passageiros/novo`}>
                Incluir passageiro
              </PrimaryLink>
              <LinkLike href={`/excursoes/${view.id}/passageiros/importar`}>
                Importar CSV
              </LinkLike>
            </div>
          ) : null}
          <ExportLinks excursionId={view.id} />
          <PassengerList
            passengers={view.passengers}
            excursionId={writable ? view.id : undefined}
          />
          {view.rooms.length > 0 ? <RoomingList rooms={view.rooms} /> : null}
        </div>
      </div>
      {writable ? (
        <>
          <BoardingForm excursionId={view.id} points={view.boardingPoints} />
          <ExcursionSettingsForm
            excursion={{
              id: view.id,
              destination: view.destination,
              originCity: view.originCity ?? "",
              departureDate: calendarDateInBrazil(view.departureAt),
              returnDate: view.returnAt ? calendarDateInBrazil(view.returnAt) : "",
              status: view.status,
            }}
          />
        </>
      ) : null}
    </article>
  );
}


function ExportLinks({ excursionId }: { excursionId: string }) {
  return (
    <div className="mt-6 space-y-2 text-sm">
      <p>
        <Link
          href={`/excursoes/${excursionId}/exportacoes/passageiros.csv`}
          className="inline-flex min-h-11 items-center"
        >
          Baixar lista em CSV
        </Link>
      </p>
      <p>
        <Link
          href={`/excursoes/${excursionId}/exportacoes/passageiros.pdf`}
          className="inline-flex min-h-11 items-center"
        >
          Baixar lista em PDF
        </Link>
      </p>
      <p>
        <Link
          href={`/excursoes/${excursionId}/exportacoes/antt.csv`}
          className="inline-flex min-h-11 items-center"
        >
          Baixar lista no formato da ANTT
        </Link>
      </p>
      <p className="text-muted dark:text-faint">
        A lista no formato da ANTT (nome, documento e poltrona) não substitui o
        licenciamento.
      </p>
    </div>
  );
}

function LinkLike({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center">
      {children}
    </Link>
  );
}
