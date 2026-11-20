import "server-only";
import { todayInBrazil } from "@/lib/domain/dates";
import { loadAgencyData, type LoadResult } from "@/lib/db/source";
import {
  projectDashboard,
  projectDueAttention,
  projectExcursion,
  projectPassengerFile,
  projectSeatPage,
  type AttentionItem,
  type Dashboard,
  type ExcursionView,
  type PassengerFile,
  type SeatPage,
} from "./views";
import {
  passengerExportRows,
  type PassengerExportRow,
} from "@/lib/domain/export-lists";

export async function getDashboard(
  today = todayInBrazil(),
): Promise<LoadResult<Dashboard>> {
  const loaded = await loadAgencyData();
  if (!loaded.ok) return loaded;
  return {
    ok: true,
    source: loaded.source,
    data: projectDashboard(loaded.data, today),
  };
}

export async function listDueAttention(
  today = todayInBrazil(),
): Promise<LoadResult<AttentionItem[]>> {
  const loaded = await loadAgencyData();
  if (!loaded.ok) return loaded;
  return {
    ok: true,
    source: loaded.source,
    data: projectDueAttention(loaded.data, today),
  };
}

export async function getPassengerFile(
  excursionId: string,
  passengerId: string,
  today = todayInBrazil(),
): Promise<LoadResult<PassengerFile | null>> {
  void today;
  const loaded = await loadAgencyData();
  if (!loaded.ok) return loaded;
  return {
    ok: true,
    source: loaded.source,
    data: projectPassengerFile(loaded.data, excursionId, passengerId),
  };
}

export async function getSeatPage(
  excursionId: string,
  seatId: string,
  today = todayInBrazil(),
): Promise<LoadResult<SeatPage | null>> {
  void today;
  const loaded = await loadAgencyData();
  if (!loaded.ok) return loaded;
  return {
    ok: true,
    source: loaded.source,
    data: projectSeatPage(loaded.data, excursionId, seatId),
  };
}

export async function getExcursionView(
  id: string,
  today = todayInBrazil(),
): Promise<LoadResult<ExcursionView | null>> {
  const loaded = await loadAgencyData();
  if (!loaded.ok) return loaded;
  return {
    ok: true,
    source: loaded.source,
    data: projectExcursion(loaded.data, id, today),
  };
}


export async function getPassengerExport(
  excursionId: string,
): Promise<LoadResult<{
  destination: string;
  departureAt: string;
  rows: PassengerExportRow[];
} | null>> {
  const loaded = await loadAgencyData();
  if (!loaded.ok) return loaded;
  const excursion = loaded.data.excursions.find((item) => item.id === excursionId);
  if (!excursion) {
    return { ok: true, source: loaded.source, data: null };
  }
  return {
    ok: true,
    source: loaded.source,
    data: {
      destination: excursion.destination,
      departureAt: excursion.departureAt,
      rows: passengerExportRows(
        loaded.data.passengers.filter((item) => item.excursionId === excursionId),
        loaded.data.seats.filter((item) => item.excursionId === excursionId),
        loaded.data.boardingPoints.filter((item) => item.excursionId === excursionId),
      ),
    },
  };
}
