import { normalizeBrazilPhone } from "./pix-key";

export function whatsappUrlForPhone(phone: string | null, message: string): string {
  const text = encodeURIComponent(message);
  const normalized = phone ? normalizeBrazilPhone(phone) : null;
  if (!normalized) return `https://wa.me/?text=${text}`;
  const e164 = normalized.replace("+", "");
  return `https://wa.me/${e164}?text=${text}`;
}
