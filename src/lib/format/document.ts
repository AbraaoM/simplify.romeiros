export function isCpfDigits(value: string): boolean {
  return /^\d{11}$/.test(value);
}

export function isCnpjDigits(value: string): boolean {
  return /^\d{14}$/.test(value);
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatDocument(
  type: string,
  value: string | null,
): string {
  if (!value) return "Documento não informado";
  if (type === "cpf") return formatCpf(value);
  return value;
}

/**
 * Valida CPF pelo dígito verificador (módulo 11).
 * Rejeita sequências repetidas (000... / 111...).
 */
export function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (!isCpfDigits(digits)) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  return checkDigit(digits, 9, 10) === digits[9] && checkDigit(digits, 10, 11) === digits[10];
}

/**
 * Valida CNPJ pelo dígito verificador (módulo 11).
 * Rejeita sequências repetidas.
 */
export function isValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (!isCnpjDigits(digits)) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return cnpjDigit(digits, w1) === digits[12] && cnpjDigit(digits, w2) === digits[13];
}

function checkDigit(digits: string, length: number, startWeight: number): string {
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += Number(digits[index]) * (startWeight - index);
  }
  const remainder = sum % 11;
  return remainder < 2 ? "0" : String(11 - remainder);
}

function cnpjDigit(digits: string, weights: number[]): string {
  const sum = weights.reduce(
    (total, weight, index) => total + Number(digits[index]) * weight,
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? "0" : String(11 - remainder);
}

/**
 * Máscara padrão de CPF na interface: mostra só os dois últimos dígitos.
 * Listas oficiais (ANTT) continuam usando formatDocument, sem máscara.
 */
export function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return "***";
  return `***.***.***-${digits.slice(9)}`;
}

export function formatDocumentMasked(
  type: string,
  value: string | null,
): string {
  if (!value) return "Documento não informado";
  if (type === "cpf") return maskCpf(value);
  return value;
}
