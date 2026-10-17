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

export async function getDashboard(
  today = todayInBrazil(),
): Promise<LoadResult<Dashboard>> {
  const loaded = await loadAgencyData(today);
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
  const loaded = await loadAgencyData(today);
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
  const loaded = await loadAgencyData(today);
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
  const loaded = await loadAgencyData(today);
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
  const loaded = await loadAgencyData(today);
  if (!loaded.ok) return loaded;
  return {
    ok: true,
    source: loaded.source,
    data: projectExcursion(loaded.data, id, today),
  };
}
