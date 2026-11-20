import { describe, expect, test } from "vitest";
import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  parsePassengerCsv,
  previewPassengerImport,
} from "./csv-passengers";

const HEADER = "nome,cpf,telefone,ponto de embarque,observações";

describe("parsePassengerCsv", () => {
  test("parses a semicolon file with a BOM and quoted fields", () => {
    const csv =
      "\ufeffnome;cpf;telefone;ponto de embarque;observações\n" +
      '"Souza, Maria";529.982.247-25;(12) 98166-0131;Taubaté;"viagem, janela"\n';
    const parsed = parsePassengerCsv(csv, Buffer.byteLength(csv));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      line: 2,
      fullName: "Souza, Maria",
      cpf: "52998224725",
      phone: "+5512981660131",
      boardingPointName: "Taubaté",
      notes: "viagem, janela",
      errors: [],
    });
  });

  test("reports per-line errors and skips blank lines", () => {
    const csv = [
      HEADER,
      "",
      ",11111111111,12,Rodoviária,",
      "Ana,52998224724,12981660131,Centro,ok",
    ].join("\n");
    const parsed = parsePassengerCsv(csv, Buffer.byteLength(csv));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]?.errors.length).toBeGreaterThan(0);
    expect(parsed.rows[0]?.errors.some((item) => /nome/i.test(item))).toBe(true);
    expect(parsed.rows[1]?.errors.some((item) => /CPF/i.test(item) || /dígito/i.test(item) || /inválid/i.test(item) || /11 dígitos/i.test(item))).toBe(true);
  });

  test("rejects a file that is too large or has too many rows", () => {
    expect(parsePassengerCsv(HEADER, MAX_IMPORT_BYTES + 1).ok).toBe(false);
    const many = [HEADER, ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `Pessoa ${i},,,,,`)].join("\n");
    expect(parsePassengerCsv(many, Buffer.byteLength(many)).ok).toBe(false);
  });
});

describe("previewPassengerImport", () => {
  test("flags a duplicate CPF in the file and in the excursion", () => {
    const csv = [
      HEADER,
      "Maria,529.982.247-25,12981660131,Taubaté,",
      "Maria Cópia,52998224725,,Pinda,",
      "João,111.444.777-35,,Centro,",
    ].join("\n");
    const parsed = parsePassengerCsv(csv, Buffer.byteLength(csv));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const preview = previewPassengerImport(parsed.rows, {
      existing: [
        { documentType: "cpf", documentNumber: "11144477735", status: "reserved" },
      ],
      boardingPoints: [
        { id: "bp-1", name: "Taubaté" },
        { id: "bp-2", name: "Pinda" },
      ],
    });
    expect(preview.errorCount).toBe(3);
    expect(preview.records).toHaveLength(0);
    expect(preview.rows[0]?.errors.some((item) => /mais de uma vez/i.test(item))).toBe(true);
    expect(preview.rows[2]?.errors.some((item) => /já está nesta excursão/i.test(item))).toBe(true);
  });

  test("accepts a clean file and matches boarding points without case or accents", () => {
    const csv = `${HEADER}\nAna,52998224725,12981660131,taubate,janela`;
    const parsed = parsePassengerCsv(csv, Buffer.byteLength(csv));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const preview = previewPassengerImport(parsed.rows, {
      existing: [],
      boardingPoints: [{ id: "bp-1", name: "Taubaté" }],
    });
    expect(preview.errorCount).toBe(0);
    expect(preview.records).toEqual([
      {
        line: 2,
        fullName: "Ana",
        documentType: "cpf",
        documentNumber: "52998224725",
        phone: "+5512981660131",
        boardingPointId: "bp-1",
        notes: "janela",
      },
    ]);
  });
});
