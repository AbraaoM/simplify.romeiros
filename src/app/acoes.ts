"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/services/action-state";
import {
  addBoardingPoint,
  addInstallment,
  assignSeat,
  cancelPassenger,
  createExcursion,
  createPassenger,
  importPassengers,
  markPaid,
  previewPassengerCsv,
  releaseSeat,
  saveAgency,
  updateExcursion,
  updatePassenger,
} from "@/lib/services/commands";
import { idleImportState, type ImportActionState } from "./import-state";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function refresh(excursionId?: string) {
  revalidatePath("/");
  revalidatePath("/pendencias");
  revalidatePath("/agencia");
  if (excursionId) revalidatePath(`/excursoes/${excursionId}`);
}

export async function saveAgencyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await saveAgency({
    name: text(formData, "name"),
    phone: text(formData, "phone"),
    city: text(formData, "city"),
    pixKey: text(formData, "pixKey"),
  });
  if (!result.ok) return { message: result.message };
  refresh();
  redirect("/");
}

export async function createExcursionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await createExcursion({
    destination: text(formData, "destination"),
    originCity: text(formData, "originCity"),
    departureDate: text(formData, "departureDate"),
    returnDate: text(formData, "returnDate"),
    capacity: text(formData, "capacity"),
    boarding: text(formData, "boarding"),
  });
  if (!result.ok) return { message: result.message };
  refresh(result.id);
  redirect(`/excursoes/${result.id}`);
}

export async function updateExcursionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = text(formData, "id");
  const result = await updateExcursion({
    id,
    destination: text(formData, "destination"),
    originCity: text(formData, "originCity"),
    departureDate: text(formData, "departureDate"),
    returnDate: text(formData, "returnDate"),
    status: text(formData, "status"),
  });
  if (!result.ok) return { message: result.message };
  refresh(id);
  redirect(`/excursoes/${id}`);
}

export async function addBoardingPointAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const excursionId = text(formData, "excursionId");
  const result = await addBoardingPoint({
    excursionId,
    name: text(formData, "name"),
  });
  if (!result.ok) return { message: result.message };
  refresh(excursionId);
  redirect(`/excursoes/${excursionId}`);
}

export async function createPassengerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const excursionId = text(formData, "excursionId");
  const result = await createPassenger({
    excursionId,
    fullName: text(formData, "fullName"),
    phone: text(formData, "phone"),
    documentType: text(formData, "documentType"),
    documentNumber: text(formData, "documentNumber"),
    documentIssuer: text(formData, "documentIssuer"),
    boardingPointId: text(formData, "boardingPointId"),
    amount: text(formData, "amount"),
    dueDate: text(formData, "dueDate"),
  });
  if (!result.ok) return { message: result.message };
  refresh(excursionId);
  redirect(`/excursoes/${excursionId}`);
}

export async function updatePassengerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const excursionId = text(formData, "excursionId");
  const passengerId = text(formData, "passengerId");
  const result = await updatePassenger({
    excursionId,
    passengerId,
    fullName: text(formData, "fullName"),
    phone: text(formData, "phone"),
    documentType: text(formData, "documentType"),
    documentNumber: text(formData, "documentNumber"),
    documentIssuer: text(formData, "documentIssuer"),
    boardingPointId: text(formData, "boardingPointId"),
  });
  if (!result.ok) return { message: result.message };
  refresh(excursionId);
  redirect(`/excursoes/${excursionId}/passageiros/${passengerId}`);
}

export async function addInstallmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const excursionId = text(formData, "excursionId");
  const passengerId = text(formData, "passengerId");
  const result = await addInstallment({
    excursionId,
    passengerId,
    amount: text(formData, "amount"),
    dueDate: text(formData, "dueDate"),
  });
  if (!result.ok) return { message: result.message };
  refresh(excursionId);
  redirect(`/excursoes/${excursionId}/passageiros/${passengerId}`);
}

export async function markPaidAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const excursionId = text(formData, "excursionId");
  const passengerId = text(formData, "passengerId");
  const result = await markPaid({
    excursionId,
    passengerId,
    installmentId: text(formData, "installmentId"),
  });
  if (!result.ok) return { message: result.message };
  refresh(excursionId);
  redirect(`/excursoes/${excursionId}/passageiros/${passengerId}`);
}

export async function assignSeatAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const excursionId = text(formData, "excursionId");
  const result = await assignSeat({
    excursionId,
    seatId: text(formData, "seatId"),
    passengerId: text(formData, "passengerId"),
  });
  if (!result.ok) return { message: result.message };
  refresh(excursionId);
  redirect(`/excursoes/${excursionId}`);
}

export async function releaseSeatAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const excursionId = text(formData, "excursionId");
  const result = await releaseSeat({
    excursionId,
    seatId: text(formData, "seatId"),
  });
  if (!result.ok) return { message: result.message };
  refresh(excursionId);
  redirect(`/excursoes/${excursionId}`);
}

export async function cancelPassengerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const excursionId = text(formData, "excursionId");
  const result = await cancelPassenger({
    excursionId,
    passengerId: text(formData, "passengerId"),
    confirmed: formData.get("confirm") === "yes",
  });
  if (!result.ok) return { message: result.message };
  refresh(excursionId);
  redirect(`/excursoes/${excursionId}`);
}


async function readCsvUpload(
  formData: FormData,
): Promise<{ ok: true; content: string; byteLength: number } | { ok: false; message: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Escolha um arquivo CSV." };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return { ok: true, content: buffer.toString("utf8"), byteLength: buffer.byteLength };
}

export async function previewPassengerCsvAction(
  _prev: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const excursionId = text(formData, "excursionId");
  const file = await readCsvUpload(formData);
  if (!file.ok) return { ...idleImportState, message: file.message };
  const result = await previewPassengerCsv({
    excursionId,
    content: file.content,
    byteLength: file.byteLength,
  });
  if (!result.ok) return { ...idleImportState, message: result.message };
  return {
    message:
      result.errorCount === 0
        ? `Pronto para importar ${result.rows.length} passageiro${result.rows.length === 1 ? "" : "s"}.`
        : "Corrija as linhas com erro antes de importar.",
    rows: result.rows,
    errorCount: result.errorCount,
    imported: null,
  };
}

export async function importPassengersAction(
  _prev: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const excursionId = text(formData, "excursionId");
  const file = await readCsvUpload(formData);
  if (!file.ok) return { ...idleImportState, message: file.message };
  const result = await importPassengers({
    excursionId,
    content: file.content,
    byteLength: file.byteLength,
  });
  if (!result.ok) return { ...idleImportState, message: result.message };
  refresh(excursionId);
  redirect(`/excursoes/${excursionId}`);
}
