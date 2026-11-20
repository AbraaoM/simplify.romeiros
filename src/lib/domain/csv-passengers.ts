import { normalizeBrazilPhone } from "@/lib/format/pix-key";
import { normalizeDocument, requireName } from "./commands";

export const MAX_IMPORT_BYTES = 512 * 1024;
export const MAX_IMPORT_ROWS = 500;
export const MAX_NAME_LENGTH = 120;
export const MAX_NOTES_LENGTH = 500;

export type CsvPassengerRow = {
  line: number;
  fullName: string;
  cpf: string | null;
  phone: string | null;
  boardingPointName: string | null;
  notes: string | null;
  errors: string[];
};

export type ImportPassengerRecord = {
  line: number;
  fullName: string;
  documentType: "cpf";
  documentNumber: string | null;
  phone: string | null;
  boardingPointId: string | null;
  notes: string | null;
};

export type ParseCsvResult =
  | { ok: false; message: string }
  | { ok: true; rows: CsvPassengerRow[] };

const HEADERS: Record<string, "fullName" | "cpf" | "phone" | "boardingPointName" | "notes"> = {
  nome: "fullName",
  name: "fullName",
  passageiro: "fullName",
  cpf: "cpf",
  documento: "cpf",
  telefone: "phone",
  fone: "phone",
  celular: "phone",
  whatsapp: "phone",
  "ponto de embarque": "boardingPointName",
  ponto: "boardingPointName",
  embarque: "boardingPointName",
  observacoes: "notes",
  "observações": "notes",
  obs: "notes",
  notas: "notes",
};

export function parsePassengerCsv(input: string, byteLength: number): ParseCsvResult {
  if (byteLength > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      message: "O arquivo pode ter no máximo 512 KB.",
    };
  }

  const text = stripBom(input).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!text.trim()) {
    return { ok: false, message: "O arquivo está vazio." };
  }

  const matrix = parseCsvMatrix(text);
  if (matrix.length === 0) {
    return { ok: false, message: "O arquivo está vazio." };
  }

  const header = matrix[0]?.map((cell) => normalizeHeader(cell)) ?? [];
  const delimiterOk = header.some((cell) => cell in HEADERS || cell === "whatsapp");
  if (!delimiterOk) {
    return {
      ok: false,
      message:
        "A primeira linha precisa ter as colunas: nome, cpf, telefone, ponto de embarque, observações.",
    };
  }

  const columns = header.map((cell) => HEADERS[cell] ?? null);
  if (!columns.includes("fullName")) {
    return { ok: false, message: "A planilha precisa de uma coluna de nome." };
  }

  const dataLines = matrix.slice(1);
  if (dataLines.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      message: `O arquivo pode ter no máximo ${MAX_IMPORT_ROWS} passageiros.`,
    };
  }

  const rows: CsvPassengerRow[] = [];
  dataLines.forEach((cells, index) => {
    if (cells.every((cell) => cell.trim() === "")) return;
    const line = index + 2;
    const record = {
      fullName: "",
      cpf: "",
      phone: "",
      boardingPointName: "",
      notes: "",
    };
    columns.forEach((column, columnIndex) => {
      if (!column) return;
      record[column] = cells[columnIndex] ?? "";
    });
    rows.push(validateCsvRow(line, record));
  });

  if (rows.length === 0) {
    return { ok: false, message: "Não há passageiros no arquivo." };
  }

  return { ok: true, rows };
}

export type ImportPreview = {
  rows: CsvPassengerRow[];
  errorCount: number;
  records: ImportPassengerRecord[];
};

export function previewPassengerImport(
  rows: CsvPassengerRow[],
  input: {
    existing: Array<{ documentType: string; documentNumber: string | null; status: string }>;
    boardingPoints: Array<{ id: string; name: string }>;
  },
): ImportPreview {
  const existingCpfs = new Set(
    input.existing
      .filter(
        (item) =>
          item.documentType === "cpf" &&
          item.documentNumber &&
          item.status !== "cancelled",
      )
      .map((item) => item.documentNumber as string),
  );
  const fileCpfs = new Map<string, number[]>();
  for (const row of rows) {
    if (!row.cpf) continue;
    const list = fileCpfs.get(row.cpf) ?? [];
    list.push(row.line);
    fileCpfs.set(row.cpf, list);
  }

  const previewRows: CsvPassengerRow[] = [];
  const records: ImportPassengerRecord[] = [];

  for (const row of rows) {
    const errors = [...row.errors];
    if (row.cpf && (fileCpfs.get(row.cpf)?.length ?? 0) > 1) {
      errors.push("Este CPF aparece mais de uma vez no arquivo.");
    }
    if (row.cpf && existingCpfs.has(row.cpf)) {
      errors.push("Este CPF já está nesta excursão.");
    }
    let boardingPointId: string | null = null;
    if (row.boardingPointName) {
      const point = matchBoardingPoint(input.boardingPoints, row.boardingPointName);
      if (!point) {
        errors.push("Esse ponto de embarque não está nesta excursão.");
      } else {
        boardingPointId = point.id;
      }
    }
    const uniqueErrors = unique(errors);
    previewRows.push({ ...row, errors: uniqueErrors });
    if (uniqueErrors.length === 0) {
      records.push({
        line: row.line,
        fullName: row.fullName,
        documentType: "cpf",
        documentNumber: row.cpf,
        phone: row.phone,
        boardingPointId,
        notes: row.notes,
      });
    }
  }

  return {
    rows: previewRows,
    errorCount: previewRows.filter((row) => row.errors.length > 0).length,
    records,
  };
}

function validateCsvRow(
  line: number,
  record: {
    fullName: string;
    cpf: string;
    phone: string;
    boardingPointName: string;
    notes: string;
  },
): CsvPassengerRow {
  const errors: string[] = [];
  const name = requireName(record.fullName);
  let fullName = "";
  if (!name.ok) {
    errors.push(name.message);
  } else if (name.name.length > MAX_NAME_LENGTH) {
    errors.push("O nome pode ter no máximo 120 caracteres.");
  } else {
    fullName = name.name;
  }

  let cpf: string | null = null;
  if (record.cpf.trim()) {
    const document = normalizeDocument("cpf", record.cpf);
    if (!document.ok) {
      errors.push(document.message);
    } else {
      cpf = document.number;
    }
  }

  let phone: string | null = null;
  if (record.phone.trim()) {
    const normalized = normalizeBrazilPhone(record.phone);
    if (!normalized) {
      errors.push("Informe um telefone com DDD.");
    } else {
      phone = normalized;
    }
  }

  const notesRaw = record.notes.trim();
  if (notesRaw.length > MAX_NOTES_LENGTH) {
    errors.push("As observações podem ter no máximo 500 caracteres.");
  }

  const boarding = record.boardingPointName.trim();

  return {
    line,
    fullName,
    cpf,
    phone,
    boardingPointName: boarding || null,
    notes: notesRaw ? notesRaw : null,
    errors,
  };
}

function matchBoardingPoint(
  points: Array<{ id: string; name: string }>,
  name: string,
) {
  const needle = normalizeName(name);
  return points.find((point) => normalizeName(point.name) === needle) ?? null;
}

function normalizeName(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\ufeff/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function parseCsvMatrix(text: string): string[][] {
  const first = text.split("\n").find((line) => line.trim()) ?? "";
  const delimiter = detectDelimiter(first);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      pushField();
      continue;
    }
    if (char === "\n") {
      pushRow();
      continue;
    }
    field += char;
  }
  if (quoted) {
    // Unclosed quote: still close the row so validation can report it later.
  }
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }
  return rows;
}

function detectDelimiter(headerLine: string): "," | ";" | "\t" {
  const counts = {
    ",": countUnquoted(headerLine, ","),
    ";": countUnquoted(headerLine, ";"),
    "\t": countUnquoted(headerLine, "\t"),
  };
  if (counts[";"] > counts[","] && counts[";"] >= counts["\t"]) return ";";
  if (counts["\t"] > counts[","] && counts["\t"] > counts[";"]) return "\t";
  return ",";
}

function countUnquoted(line: string, delimiter: string): number {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === delimiter) count += 1;
  }
  return count;
}
