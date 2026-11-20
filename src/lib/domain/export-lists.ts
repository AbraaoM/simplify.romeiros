import { formatDocument } from "@/lib/format/document";
import { buildSimplePdf } from "./simple-pdf";
import type { BoardingPoint, Passenger, Seat } from "./types";

export type PassengerExportRow = {
  fullName: string;
  documentType: string;
  documentNumber: string | null;
  phone: string | null;
  boardingPointName: string | null;
  seatNumber: number | null;
  status: string;
  notes: string | null;
};

export const ANTT_DISCLAIMER =
  "Esta lista não substitui o licenciamento ou as obrigações da ANTT.";

export function passengerExportRows(
  passengers: Passenger[],
  seats: Seat[],
  boardingPoints: BoardingPoint[],
): PassengerExportRow[] {
  return passengers
    .filter((passenger) => passenger.status !== "cancelled" && !passenger.anonymizedAt)
    .map((passenger) => ({
      fullName: passenger.fullName,
      documentType: passenger.documentType,
      documentNumber: passenger.documentNumber,
      phone: passenger.phone,
      boardingPointName:
        boardingPoints.find((point) => point.id === passenger.boardingPointId)?.name ??
        null,
      seatNumber: seats.find((seat) => seat.passengerId === passenger.id)?.seatNumber ?? null,
      status: passenger.status,
      notes: passenger.notes,
    }))
    .sort((a, b) => {
      if (a.seatNumber !== null && b.seatNumber !== null && a.seatNumber !== b.seatNumber) {
        return a.seatNumber - b.seatNumber;
      }
      if (a.seatNumber === null && b.seatNumber !== null) return 1;
      if (a.seatNumber !== null && b.seatNumber === null) return -1;
      return a.fullName.localeCompare(b.fullName, "pt-BR");
    });
}

export function passengersCsv(rows: PassengerExportRow[]): string {
  const header = [
    "Nome",
    "Documento",
    "Poltrona",
    "Telefone",
    "Ponto de embarque",
    "Observações",
  ];
  const lines = [
    header,
    ...rows.map((row) => [
      row.fullName,
      formatDocument(row.documentType, row.documentNumber),
      row.seatNumber ? String(row.seatNumber) : "",
      row.phone ?? "",
      row.boardingPointName ?? "",
      row.notes ?? "",
    ]),
  ];
  return withBom(toCsv(lines));
}

export function anttPassengersCsv(rows: PassengerExportRow[]): string {
  const header = ["Nome", "Documento", "Poltrona"];
  const lines = [
    header,
    ...rows.map((row) => [
      row.fullName,
      formatDocument(row.documentType, row.documentNumber),
      row.seatNumber ? String(row.seatNumber) : "",
    ]),
  ];
  return withBom(toCsv(lines));
}

export function passengersPdf(
  title: string,
  subtitle: string,
  rows: PassengerExportRow[],
  footer = "",
): Uint8Array {
  const lines = [
    subtitle,
    "",
    ...rows.map((row) => {
      const seat = row.seatNumber ? `Poltrona ${row.seatNumber}` : "Sem poltrona";
      const document = formatDocument(row.documentType, row.documentNumber);
      const phone = row.phone ? ` · ${row.phone}` : "";
      const boarding = row.boardingPointName ? ` · ${row.boardingPointName}` : "";
      return `${row.fullName} · ${document} · ${seat}${phone}${boarding}`;
    }),
  ];
  if (footer) {
    lines.push("", footer);
  }
  return buildSimplePdf(title, lines);
}

export function anttPassengersPdf(
  title: string,
  subtitle: string,
  rows: PassengerExportRow[],
): Uint8Array {
  const lines = [
    subtitle,
    ANTT_DISCLAIMER,
    "",
    ...rows.map((row) => {
      const seat = row.seatNumber ? `Poltrona ${row.seatNumber}` : "Sem poltrona";
      return `${row.fullName} · ${formatDocument(row.documentType, row.documentNumber)} · ${seat}`;
    }),
  ];
  return buildSimplePdf(title, lines);
}

export function withBom(csv: string): string {
  return `\ufeff${csv}`;
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map(csvField).join(";"))
    .join("\r\n");
}

function csvField(value: string): string {
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
