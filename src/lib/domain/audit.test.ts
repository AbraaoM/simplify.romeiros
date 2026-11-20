import { expect, test } from "vitest";
import { sanitizeAuditPayload } from "./audit";

test("keeps only non-personal payload keys", () => {
  const payload = sanitizeAuditPayload({
    format: "json",
    count: 3,
    kind: "antt-csv",
    fullName: "Maria Silva",
    cpf: "52998224725",
    phone: "12981660131",
    email: "maria@example.com",
    token: "secret",
    notes: "alergia",
  });
  expect(payload).toEqual({ format: "json", count: 3, kind: "antt-csv" });
  expect(JSON.stringify(payload)).not.toMatch(/Maria|52998224725|12981660131|alergia|secret/i);
});

test("drops unknown and malformed keys", () => {
  expect(sanitizeAuditPayload({ format: "xml", count: "3", extra: true })).toEqual({});
  expect(sanitizeAuditPayload(null)).toEqual({});
});
