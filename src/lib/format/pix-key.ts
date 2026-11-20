import { isValidCnpj, isValidCpf } from "./document";

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "evp";

export type NormalizedPixKey = {
  type: PixKeyType;
  key: string;
};

const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const EVP = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Normaliza e classifica uma chave Pix (CPF, CNPJ, e-mail, telefone E.164
 * com +55, ou chave aleatória EVP no formato UUID).
 */
export function normalizePixKey(
  raw: string,
): { ok: true; value: NormalizedPixKey } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: { type: "evp", key: "" } };
  }

  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    if (!EMAIL.test(email) || email.length > 77) {
      return { ok: false, message: "Informe um e-mail válido para a chave Pix." };
    }
    return { ok: true, value: { type: "email", key: email } };
  }

  const lower = trimmed.toLowerCase();
  if (EVP.test(lower)) {
    return { ok: true, value: { type: "evp", key: lower } };
  }

  const digits = trimmed.replace(/\D/g, "");
  const looksLikeCpfMask = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(trimmed);

  if (digits.length === 11) {
    if (isValidCpf(digits)) {
      return { ok: true, value: { type: "cpf", key: digits } };
    }
    if (!looksLikeCpfMask && isBrazilLocalPhone(digits)) {
      return { ok: true, value: { type: "phone", key: `+55${digits}` } };
    }
    return {
      ok: false,
      message: "Informe uma chave Pix em CPF, CNPJ, e-mail, telefone (+55) ou chave aleatória.",
    };
  }

  if (digits.length === 14) {
    if (isValidCnpj(digits)) {
      return { ok: true, value: { type: "cnpj", key: digits } };
    }
    return {
      ok: false,
      message: "Informe uma chave Pix em CPF, CNPJ, e-mail, telefone (+55) ou chave aleatória.",
    };
  }

  const phone = normalizeBrazilPhone(trimmed);
  if (phone) {
    return { ok: true, value: { type: "phone", key: phone } };
  }

  return {
    ok: false,
    message:
      "Informe uma chave Pix em CPF, CNPJ, e-mail, telefone (+55) ou chave aleatória.",
  };
}

export function normalizeBrazilPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }
  if (isBrazilLocalPhone(digits)) {
    return `+55${digits}`;
  }
  return null;
}


const BRAZIL_DDD = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

function isBrazilLocalPhone(digits: string): boolean {
  if (digits.length === 10) return BRAZIL_DDD.has(digits.slice(0, 2));
  if (digits.length === 11) {
    return BRAZIL_DDD.has(digits.slice(0, 2)) && digits[2] === "9";
  }
  return false;
}

export function emptyPixKey(raw: string): boolean {
  return raw.trim() === "";
}
