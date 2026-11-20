export const AUDIT_ACTIONS = [
  "export_passenger",
  "anonymize_passenger",
  "import_csv",
  "export_antt",
  "mark_paid",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITIES = [
  "passenger",
  "installment",
  "excursion",
] as const;

export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

/** Only non-personal, non-secret keys may appear in the audit payload. */
const ALLOWED_PAYLOAD_KEYS = new Set(["format", "count", "kind"]);

const FORBIDDEN_PAYLOAD_KEY =
  /^(name|full_?name|cpf|cnpj|document|phone|email|pix|password|token|hash|address|notes?)$/i;

export type AuditPayload = {
  format?: "json" | "csv";
  count?: number;
  kind?: string;
};

export function sanitizeAuditPayload(
  input: Record<string, unknown> | null | undefined,
): AuditPayload {
  if (!input) return {};
  const payload: AuditPayload = {};
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_PAYLOAD_KEY.test(key) || !ALLOWED_PAYLOAD_KEYS.has(key)) {
      continue;
    }
    if (key === "format" && (value === "json" || value === "csv")) {
      payload.format = value;
    } else if (key === "count" && typeof value === "number" && Number.isFinite(value)) {
      payload.count = value;
    } else if (key === "kind" && typeof value === "string" && value.length <= 40) {
      payload.kind = value;
    }
  }
  return payload;
}

export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}
