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
