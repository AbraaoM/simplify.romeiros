/**
 * Payload EMV de Pix "copia e cola" estático (BR Code / MPM).
 *
 * Referências oficiais do Banco Central do Brasil:
 * - Manual de Padrões para Iniciação do Pix (Regulamento do Pix),
 *   disponível em
 *   https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 *   — exemplo de QR estático (seção de exemplos do manual): CRC 0x1D3D
 *   sobre o payload que termina em "6304".
 * - Manual do BR Code,
 *   https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf
 *   — CRC-16-CCITT com polinômio 0x1021 e valor inicial 0xFFFF
 *   (CRC-16/CCITT-FALSE), campo 63 com 4 nibbles hexadecimais maiúsculos.
 *
 * O payload é estático: o dinheiro vai direto à chave Pix cadastrada pela
 * agência. Não há PSP nem custódia nesta plataforma.
 */

export type StaticPixInput = {
  key: string;
  merchantName: string;
  merchantCity: string;
  amountCents?: number;
  txid?: string;
};

const GUI = "br.gov.bcb.pix";

export function buildStaticPixPayload(input: StaticPixInput): string {
  const key = input.key.trim();
  if (!key) {
    throw new Error("A chave Pix é obrigatória.");
  }
  const name = emvText(input.merchantName, 25, "AGENCIA");
  const city = emvText(input.merchantCity, 15, "BRASIL");
  const txid = sanitizeTxid(input.txid);

  const merchantAccount = tlv("00", GUI) + tlv("01", key);
  let payload = "";
  payload += tlv("00", "01");
  payload += tlv("26", merchantAccount);
  payload += tlv("52", "0000");
  payload += tlv("53", "986");
  if (input.amountCents !== undefined) {
    payload += tlv("54", formatPixAmount(input.amountCents));
  }
  payload += tlv("58", "BR");
  payload += tlv("59", name);
  payload += tlv("60", city);
  payload += tlv("62", tlv("05", txid));
  payload += "6304";
  return payload + crc16CcittFalse(payload);
}

export function formatPixAmount(amountCents: number): string {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error("Valor da parcela inválido.");
  }
  return (amountCents / 100).toFixed(2);
}

export function installmentTxid(installmentId: string): string {
  const compact = installmentId.replace(/-/g, "").toUpperCase();
  const body = compact.slice(0, 24);
  return `P${body}`.slice(0, 25);
}

/**
 * CRC-16/CCITT-FALSE: polinômio 0x1021, inicial 0xFFFF, sem reflexão e
 * sem XOR final, como no Manual do BR Code (seção do campo 63).
 */
export function crc16CcittFalse(input: string): string {
  let crc = 0xffff;
  for (let index = 0; index < input.length; index += 1) {
    crc ^= input.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function assertPixCrc(payload: string): boolean {
  if (payload.length < 8 || !payload.includes("6304")) return false;
  const body = payload.slice(0, -4);
  const expected = payload.slice(-4);
  return body.endsWith("6304") && crc16CcittFalse(body) === expected;
}

function tlv(id: string, value: string): string {
  if (value.length > 99) {
    throw new Error("Campo EMV excede 99 caracteres.");
  }
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function sanitizeTxid(txid: string | undefined): string {
  if (!txid || txid === "***") return "***";
  const clean = txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
  return clean || "***";
}

function emvText(raw: string, max: number, fallback: string): string {
  const normalized = stripDiacritics(raw)
    .replace(/[^A-Za-z0-9 .\/,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const text = (normalized || fallback).slice(0, max).trim();
  return text || fallback.slice(0, max);
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}
