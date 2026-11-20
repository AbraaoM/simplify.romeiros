import type { BoardingPoint, Installment, Passenger, Seat } from "./types";

export const ANONYMIZED_DISPLAY_NAME = "Passageiro anonimizado";

export type PassengerExportSnapshot = {
  passenger: {
    id: string;
    excursionId: string;
    fullName: string;
    documentType: string;
    documentNumber: string | null;
    documentIssuer: string | null;
    phone: string | null;
    email: string | null;
    status: string;
    notes: string | null;
    boardingPointName: string | null;
    seatNumber: number | null;
    anonymizedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  installments: Array<{
    id: string;
    sequence: number;
    label: string | null;
    amountCents: number;
    dueDate: string;
    status: string;
    paidAt: string | null;
    paymentMethod: string | null;
  }>;
};

export function buildPassengerExportSnapshot(input: {
  passenger: Passenger;
  installments: Installment[];
  seats: Seat[];
  boardingPoints: BoardingPoint[];
}): PassengerExportSnapshot {
  const boardingPointName =
    input.boardingPoints.find((point) => point.id === input.passenger.boardingPointId)
      ?.name ?? null;
  const seatNumber =
    input.seats.find((seat) => seat.passengerId === input.passenger.id)?.seatNumber ??
    null;
  return {
    passenger: {
      id: input.passenger.id,
      excursionId: input.passenger.excursionId,
      fullName: input.passenger.fullName,
      documentType: input.passenger.documentType,
      documentNumber: input.passenger.documentNumber,
      documentIssuer: input.passenger.documentIssuer,
      phone: input.passenger.phone,
      email: input.passenger.email,
      status: input.passenger.status,
      notes: input.passenger.notes,
      boardingPointName,
      seatNumber,
      anonymizedAt: input.passenger.anonymizedAt,
      createdAt: input.passenger.createdAt,
      updatedAt: input.passenger.updatedAt,
    },
    installments: input.installments
      .filter((item) => item.passengerId === input.passenger.id)
      .sort((a, b) => a.sequence - b.sequence)
      .map((item) => ({
        id: item.id,
        sequence: item.sequence,
        label: item.label,
        amountCents: item.amountCents,
        dueDate: item.dueDate,
        status: item.status,
        paidAt: item.paidAt,
        paymentMethod: item.paymentMethod,
      })),
  };
}

export function passengerExportCsv(snapshot: PassengerExportSnapshot): string {
  const lines = [
    "campo;valor",
    csvRow("id", snapshot.passenger.id),
    csvRow("excursao_id", snapshot.passenger.excursionId),
    csvRow("nome", snapshot.passenger.fullName),
    csvRow("documento_tipo", snapshot.passenger.documentType),
    csvRow("documento", snapshot.passenger.documentNumber),
    csvRow("orgao_emissor", snapshot.passenger.documentIssuer),
    csvRow("telefone", snapshot.passenger.phone),
    csvRow("email", snapshot.passenger.email),
    csvRow("status", snapshot.passenger.status),
    csvRow("observacoes", snapshot.passenger.notes),
    csvRow("ponto_embarque", snapshot.passenger.boardingPointName),
    csvRow("poltrona", snapshot.passenger.seatNumber?.toString() ?? null),
    csvRow("anonimizado_em", snapshot.passenger.anonymizedAt),
    csvRow("criado_em", snapshot.passenger.createdAt),
    csvRow("atualizado_em", snapshot.passenger.updatedAt),
  ];
  for (const installment of snapshot.installments) {
    const prefix = `parcela_${installment.sequence}`;
    lines.push(csvRow(`${prefix}_valor_centavos`, String(installment.amountCents)));
    lines.push(csvRow(`${prefix}_vencimento`, installment.dueDate));
    lines.push(csvRow(`${prefix}_status`, installment.status));
    lines.push(csvRow(`${prefix}_paga_em`, installment.paidAt));
    lines.push(csvRow(`${prefix}_meio`, installment.paymentMethod));
  }
  return `\ufeff${lines.join("\n")}\n`;
}

function csvRow(field: string, value: string | null): string {
  return `${escapeCsv(field)};${escapeCsv(value ?? "")}`;
}

function escapeCsv(value: string): string {
  if (/[;"\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
