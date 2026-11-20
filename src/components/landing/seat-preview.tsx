import { SeatMap } from "@/components/excursions/seat-map";
import { buildExample } from "@/lib/fixtures/example";
import { projectExcursion } from "@/lib/services/views";

const FIXTURE_TODAY = "2026-10-16";
const VISIBLE_ROWS = 8;

export function SeatPreview() {
  const data = buildExample(FIXTURE_TODAY);
  const trip = data.excursions.find((item) => item.destination === "Aparecida");
  if (!trip) {
    throw new Error("Fixture de exemplo sem a excursão Aparecida.");
  }
  const view = projectExcursion(data, trip.id, FIXTURE_TODAY);
  if (!view) {
    throw new Error("Não foi possível montar o mapa de exemplo.");
  }

  const seats = view.seats
    .filter((seat) => seat.rowIndex <= VISIBLE_ROWS)
    .map((seat) => ({ ...seat, passengerName: null }));

  return (
    <figure className="border border-line p-5 dark:border-line-dark">
      <SeatMap seats={seats} mode="coach_2_2" />
      <figcaption className="mt-5 text-sm text-muted dark:text-faint">
        Exemplo ilustrativo do mapa 2×2, com o mesmo componente do sistema.
        Poltrona ocupada não pode ser vendida de novo. Os pontos no canto
        indicam parcela atrasada ou que vence hoje.
      </figcaption>
    </figure>
  );
}
