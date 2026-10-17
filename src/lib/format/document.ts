export function isCpfDigits(value: string): boolean {
  return /^\d{11}$/.test(value);
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
