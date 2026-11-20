import type { CsvPassengerRow } from "@/lib/domain/csv-passengers";

export type ImportActionState = {
  message: string | null;
  rows: CsvPassengerRow[] | null;
  errorCount: number;
  imported: number | null;
};

export const idleImportState: ImportActionState = {
  message: null,
  rows: null,
  errorCount: 0,
  imported: null,
};

export type ExportPassengerState = {
  message: string | null;
  file: { filename: string; mime: string; content: string } | null;
};

export const idleExportPassengerState: ExportPassengerState = {
  message: null,
  file: null,
};

export type CreateInviteState = {
  message: string | null;
  url: string | null;
  whatsappUrl: string | null;
  expiresAt: string | null;
};

export const idleCreateInviteState: CreateInviteState = {
  message: null,
  url: null,
  whatsappUrl: null,
  expiresAt: null,
};
