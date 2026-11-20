import "server-only";
import {
  excursionSchedule,
  normalizeDocument,
  parseBoardingNames,
  planCancelPassenger,
  planMarkPaid,
  planNewInstallment,
  planSeatChange,
  requireName,
} from "@/lib/domain/commands";
import { buildLayoutFromCapacity } from "@/lib/domain/layouts";
import {
  emptyPixKey,
  normalizePixKey,
} from "@/lib/format/pix-key";
import {
  parsePassengerCsv,
  previewPassengerImport,
  type CsvPassengerRow,
} from "@/lib/domain/csv-passengers";
import type { DocumentType, ExcursionStatus, PixKeyType } from "@/lib/domain/types";
import { readAgencyFromDatabase } from "@/lib/repositories/agency";
import { resolveTenantContext } from "@/lib/security/context";
import {
  DB_OFF,
  NOT_FOUND,
  RecordNotFound,
  SAVE_FAILED,
  SESSION_REQUIRED,
  SecurityError,
  isSecurityError,
} from "@/lib/security/errors";
import {
  WriteConflict,
  applySeatChange,
  cancelPassengerRecord,
  insertBoardingPoint,
  insertExcursion,
  insertInstallmentRecord,
  insertPassengerRecord,
  markInstallmentPaid,
  importPassengerRecords,
  saveAgencyRecord,
  updateExcursionRecord,
  updatePassengerRecord,
} from "@/lib/repositories/commands";
export type ServiceResult<T extends Record<string, unknown> = Record<never, never>> =
  | ({ ok: true } & T)
  | { ok: false; message: string };

const EXCURSION_STATUSES: ExcursionStatus[] = [
  "draft",
  "open",
  "closed",
  "completed",
  "cancelled",
];

const DOCUMENT_TYPES: DocumentType[] = ["cpf", "rg", "passport", "other"];

async function load() {
  try {
    const context = await resolveTenantContext();
    return {
      ok: true as const,
      context,
      data: await readAgencyFromDatabase(context),
    };
  } catch (error) {
    return deny(error);
  }
}

function deny(error: unknown): { ok: false; message: string } {
  if (error instanceof SecurityError) {
    if (error.code === "unauthenticated" || error.code === "unconfigured") {
      return { ok: false, message: SESSION_REQUIRED };
    }
    if (error.code === "database") {
      return { ok: false, message: DB_OFF };
    }
    return { ok: false, message: SESSION_REQUIRED };
  }
  console.error("Falha ao ler o banco.");
  return { ok: false, message: SAVE_FAILED };
}

function fail(error: unknown): { ok: false; message: string } {
  if (error instanceof RecordNotFound) {
    return { ok: false, message: NOT_FOUND };
  }
  if (error instanceof WriteConflict) {
    return { ok: false, message: conflictMessage(error) };
  }
  if (isSecurityError(error)) {
    return deny(error);
  }
  console.error("Falha ao gravar no banco.");
  return { ok: false, message: SAVE_FAILED };
}

export async function saveAgency(input: {
  name: string;
  phone: string;
  city: string;
  pixKey?: string;
}): Promise<ServiceResult> {
  const name = requireName(input.name);
  if (!name.ok) return name;
  let pixKey: string | null = null;
  let pixKeyType: PixKeyType | null = null;
  if (!emptyPixKey(input.pixKey ?? "")) {
    const pix = normalizePixKey(input.pixKey ?? "");
    if (!pix.ok) return pix;
    pixKey = pix.value.key;
    pixKeyType = pix.value.type;
  }
  const loaded = await load();
  if (!loaded.ok) return loaded;
  try {
    await saveAgencyRecord(loaded.context, {
      name: name.name,
      phone: blank(input.phone),
      city: blank(input.city),
      pixKey,
      pixKeyType,
    });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createExcursion(input: {
  destination: string;
  originCity: string;
  departureDate: string;
  returnDate: string;
  capacity: string;
  boarding: string;
}): Promise<ServiceResult<{ id: string }>> {
  const destination = requireName(input.destination);
  if (!destination.ok) return destination;
  const schedule = excursionSchedule(input.departureDate, input.returnDate);
  if (!schedule.ok) return schedule;
  const capacity = Number(input.capacity);
  const layout = buildLayoutFromCapacity(capacity);
  if (!layout.ok) return layout;
  const loaded = await load();
  if (!loaded.ok) return loaded;
  if (!loaded.data.agency) {
    return { ok: false, message: "Cadastre a agência antes de abrir uma excursão." };
  }
  try {
    const id = await insertExcursion(loaded.context, {
      destination: destination.name,
      originCity: blank(input.originCity),
      departureAt: schedule.departureAt,
      returnAt: schedule.returnAt,
      vehicleCapacity: layout.capacity,
      vehicleLayout: layout.layout,
      seats: layout.seats,
      boardingNames: parseBoardingNames(input.boarding),
    });
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function updateExcursion(input: {
  id: string;
  destination: string;
  originCity: string;
  departureDate: string;
  returnDate: string;
  status: string;
}): Promise<ServiceResult> {
  const destination = requireName(input.destination);
  if (!destination.ok) return destination;
  const schedule = excursionSchedule(input.departureDate, input.returnDate);
  if (!schedule.ok) return schedule;
  if (!EXCURSION_STATUSES.includes(input.status as ExcursionStatus)) {
    return { ok: false, message: "Escolha a situação da excursão." };
  }
  const loaded = await load();
  if (!loaded.ok) return loaded;
  if (!loaded.data.excursions.some((item) => item.id === input.id)) {
    return { ok: false, message: NOT_FOUND };
  }
  try {
    await updateExcursionRecord(loaded.context, {
      id: input.id,
      destination: destination.name,
      originCity: blank(input.originCity),
      departureAt: schedule.departureAt,
      returnAt: schedule.returnAt,
      status: input.status as ExcursionStatus,
    });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function addBoardingPoint(input: {
  excursionId: string;
  name: string;
}): Promise<ServiceResult> {
  const name = requireName(input.name);
  if (!name.ok) return name;
  const loaded = await load();
  if (!loaded.ok) return loaded;
  if (!loaded.data.excursions.some((item) => item.id === input.excursionId)) {
    return { ok: false, message: NOT_FOUND };
  }
  const names = loaded.data.boardingPoints
    .filter((point) => point.excursionId === input.excursionId)
    .map((point) => point.name);
  if (names.includes(name.name)) {
    return { ok: false, message: "Esse ponto de embarque já existe." };
  }
  try {
    await insertBoardingPoint(loaded.context, input.excursionId, name.name);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createPassenger(input: {
  excursionId: string;
  fullName: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  documentIssuer: string;
  boardingPointId: string;
  amount: string;
  dueDate: string;
}): Promise<ServiceResult<{ id: string }>> {
  const fullName = requireName(input.fullName);
  if (!fullName.ok) return fullName;
  const documentType = asDocumentType(input.documentType);
  const document = normalizeDocument(documentType, input.documentNumber);
  if (!document.ok) return document;
  const installment = optionalInstallment(input.amount, input.dueDate, []);
  if (!installment.ok) return installment;
  const loaded = await load();
  if (!loaded.ok) return loaded;
  if (!loaded.data.excursions.some((item) => item.id === input.excursionId)) {
    return { ok: false, message: NOT_FOUND };
  }
  const point = boardingPoint(loaded.data.boardingPoints, input.excursionId, input.boardingPointId);
  if (point === "invalid") {
    return { ok: false, message: "Escolha um ponto de embarque desta excursão." };
  }
  try {
    const id = await insertPassengerRecord(loaded.context, {
      excursionId: input.excursionId,
      fullName: fullName.name,
      phone: blank(input.phone),
      documentType,
      documentNumber: document.number,
      documentIssuer: blank(input.documentIssuer),
      boardingPointId: point,
      installment: installment.installment,
    });
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function updatePassenger(input: {
  excursionId: string;
  passengerId: string;
  fullName: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  documentIssuer: string;
  boardingPointId: string;
}): Promise<ServiceResult> {
  const fullName = requireName(input.fullName);
  if (!fullName.ok) return fullName;
  const documentType = asDocumentType(input.documentType);
  const document = normalizeDocument(documentType, input.documentNumber);
  if (!document.ok) return document;
  const loaded = await load();
  if (!loaded.ok) return loaded;
  const passenger = loaded.data.passengers.find(
    (item) => item.id === input.passengerId && item.excursionId === input.excursionId,
  );
  if (!passenger) return { ok: false, message: NOT_FOUND };
  if (passenger.status === "cancelled") {
    return { ok: false, message: "Esse passageiro já está cancelado." };
  }
  const point = boardingPoint(loaded.data.boardingPoints, input.excursionId, input.boardingPointId);
  if (point === "invalid") {
    return { ok: false, message: "Escolha um ponto de embarque desta excursão." };
  }
  try {
    await updatePassengerRecord(loaded.context, {
      id: input.passengerId,
      excursionId: input.excursionId,
      fullName: fullName.name,
      phone: blank(input.phone),
      documentType,
      documentNumber: document.number,
      documentIssuer: blank(input.documentIssuer),
      boardingPointId: point,
    });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function addInstallment(input: {
  excursionId: string;
  passengerId: string;
  amount: string;
  dueDate: string;
}): Promise<ServiceResult> {
  const loaded = await load();
  if (!loaded.ok) return loaded;
  const passenger = loaded.data.passengers.find(
    (item) => item.id === input.passengerId && item.excursionId === input.excursionId,
  );
  if (!passenger) return { ok: false, message: NOT_FOUND };
  if (passenger.status === "cancelled") {
    return { ok: false, message: "Esse passageiro não está nesta excursão." };
  }
  const sequences = loaded.data.installments
    .filter((item) => item.passengerId === input.passengerId)
    .map((item) => item.sequence);
  const planned = planNewInstallment(input.amount, input.dueDate, sequences);
  if (!planned.ok) return planned;
  try {
    await insertInstallmentRecord(loaded.context, {
      passengerId: input.passengerId,
      excursionId: input.excursionId,
      sequence: planned.sequence,
      amountCents: planned.amountCents,
      dueDate: planned.dueDate,
    });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function markPaid(input: {
  excursionId: string;
  passengerId: string;
  installmentId: string;
}): Promise<ServiceResult> {
  const loaded = await load();
  if (!loaded.ok) return loaded;
  const installment = loaded.data.installments.find(
    (item) =>
      item.id === input.installmentId &&
      item.passengerId === input.passengerId &&
      item.excursionId === input.excursionId,
  );
  const planned = planMarkPaid(installment?.status ?? null);
  if (!planned.ok) return planned;
  try {
    const saved = await markInstallmentPaid(
      loaded.context,
      input.installmentId,
      input.passengerId,
      input.excursionId,
    );
    if (!saved) {
      return { ok: false, message: "Só uma parcela pendente pode ser marcada como paga." };
    }
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function assignSeat(input: {
  excursionId: string;
  seatId: string;
  passengerId: string;
}): Promise<ServiceResult> {
  const loaded = await load();
  if (!loaded.ok) return loaded;
  const seats = loaded.data.seats.filter((seat) => seat.excursionId === input.excursionId);
  const passengers = loaded.data.passengers.filter(
    (passenger) => passenger.excursionId === input.excursionId,
  );
  const planned = planSeatChange(seats, passengers, {
    type: "assign",
    seatId: input.seatId,
    passengerId: input.passengerId,
  });
  if (!planned.ok) return planned;
  const release = planned.writes.find((write) => write.status === "available");
  const occupy = planned.writes.find((write) => write.status === "occupied");
  try {
    const saved = await applySeatChange(loaded.context, {
      excursionId: input.excursionId,
      passengerId: input.passengerId,
      releaseSeatId: release?.seatId ?? null,
      occupySeatId: occupy?.seatId ?? null,
    });
    if (!saved) return { ok: false, message: "Essa poltrona acabou de ser ocupada." };
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function releaseSeat(input: {
  excursionId: string;
  seatId: string;
}): Promise<ServiceResult> {
  const loaded = await load();
  if (!loaded.ok) return loaded;
  const seats = loaded.data.seats.filter((seat) => seat.excursionId === input.excursionId);
  const passengers = loaded.data.passengers.filter(
    (passenger) => passenger.excursionId === input.excursionId,
  );
  const planned = planSeatChange(seats, passengers, {
    type: "release",
    seatId: input.seatId,
  });
  if (!planned.ok) return planned;
  const seat = seats.find((item) => item.id === input.seatId);
  if (!seat?.passengerId) {
    return { ok: false, message: "Essa poltrona já está livre." };
  }
  try {
    const saved = await applySeatChange(loaded.context, {
      excursionId: input.excursionId,
      passengerId: seat.passengerId,
      releaseSeatId: input.seatId,
      occupySeatId: null,
    });
    if (!saved) return { ok: false, message: "Essa poltrona já está livre." };
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function cancelPassenger(input: {
  excursionId: string;
  passengerId: string;
  confirmed: boolean;
}): Promise<ServiceResult> {
  if (!input.confirmed) {
    return { ok: false, message: "Confirme o cancelamento." };
  }
  const loaded = await load();
  if (!loaded.ok) return loaded;
  const passenger =
    loaded.data.passengers.find(
      (item) => item.id === input.passengerId && item.excursionId === input.excursionId,
    ) ?? null;
  const seats = loaded.data.seats.filter((seat) => seat.excursionId === input.excursionId);
  const planned = planCancelPassenger(passenger, seats);
  if (!planned.ok) return planned;
  try {
    const saved = await cancelPassengerRecord(loaded.context, {
      excursionId: input.excursionId,
      passengerId: input.passengerId,
      seatId: planned.seatIdToRelease,
    });
    if (!saved) return { ok: false, message: SAVE_FAILED };
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}


export type ImportPreviewResult = ServiceResult<{
  rows: CsvPassengerRow[];
  errorCount: number;
}>;

export async function previewPassengerCsv(input: {
  excursionId: string;
  content: string;
  byteLength: number;
}): Promise<ImportPreviewResult> {
  const parsed = parsePassengerCsv(input.content, input.byteLength);
  if (!parsed.ok) return parsed;
  const loaded = await load();
  if (!loaded.ok) return loaded;
  if (!loaded.data.excursions.some((item) => item.id === input.excursionId)) {
    return { ok: false, message: NOT_FOUND };
  }
  const preview = previewPassengerImport(parsed.rows, {
    existing: loaded.data.passengers.filter(
      (item) => item.excursionId === input.excursionId,
    ),
    boardingPoints: loaded.data.boardingPoints.filter(
      (item) => item.excursionId === input.excursionId,
    ),
  });
  return {
    ok: true,
    rows: preview.rows,
    errorCount: preview.errorCount,
  };
}

export async function importPassengers(input: {
  excursionId: string;
  content: string;
  byteLength: number;
}): Promise<ServiceResult<{ count: number }>> {
  const parsed = parsePassengerCsv(input.content, input.byteLength);
  if (!parsed.ok) return parsed;
  const loaded = await load();
  if (!loaded.ok) return loaded;
  if (!loaded.data.excursions.some((item) => item.id === input.excursionId)) {
    return { ok: false, message: NOT_FOUND };
  }
  const preview = previewPassengerImport(parsed.rows, {
    existing: loaded.data.passengers.filter(
      (item) => item.excursionId === input.excursionId,
    ),
    boardingPoints: loaded.data.boardingPoints.filter(
      (item) => item.excursionId === input.excursionId,
    ),
  });
  if (preview.errorCount > 0) {
    return { ok: false, message: "Corrija as linhas com erro antes de importar." };
  }
  if (preview.records.length === 0) {
    return { ok: false, message: "Não há passageiros no arquivo." };
  }
  try {
    const ids = await importPassengerRecords(loaded.context, {
      excursionId: input.excursionId,
      records: preview.records,
    });
    return { ok: true, count: ids.length };
  } catch (error) {
    return fail(error);
  }
}

function conflictMessage(error: WriteConflict): string {
  if (error.kind === "cpf") return "Este CPF já está nesta excursão.";
  if (error.kind === "installment") {
    return "Não foi possível lançar a parcela. Tente de novo.";
  }
  return "Não foi possível gravar. Tente de novo.";
}

function optionalInstallment(amount: string, dueDate: string, sequences: number[]) {
  if (!amount.trim() && !dueDate.trim()) {
    return { ok: true as const, installment: null };
  }
  if (!amount.trim() || !dueDate.trim()) {
    return {
      ok: false as const,
      message: "Informe o valor e o vencimento da parcela.",
    };
  }
  const planned = planNewInstallment(amount, dueDate, sequences);
  if (!planned.ok) return planned;
  return {
    ok: true as const,
    installment: {
      amountCents: planned.amountCents,
      dueDate: planned.dueDate,
      sequence: planned.sequence,
    },
  };
}

function boardingPoint(
  points: Array<{ id: string; excursionId: string }>,
  excursionId: string,
  id: string,
): string | null | "invalid" {
  const trimmed = id.trim();
  if (!trimmed) return null;
  const point = points.find((item) => item.id === trimmed && item.excursionId === excursionId);
  return point ? point.id : "invalid";
}

function asDocumentType(value: string): DocumentType {
  return DOCUMENT_TYPES.includes(value as DocumentType) ? (value as DocumentType) : "cpf";
}

function blank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
