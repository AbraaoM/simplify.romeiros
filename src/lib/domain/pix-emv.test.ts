import { describe, expect, test } from "vitest";
import {
  assertPixCrc,
  buildStaticPixPayload,
  crc16CcittFalse,
  formatPixAmount,
  installmentTxid,
} from "./pix-emv";

/**
 * Vetores oficiais:
 * - CRC-16/CCITT-FALSE de "123456789" = 0x29B1 (vetor clássico do algoritmo,
 *   confirmado pelo Manual do BR Code / CRC-16-CCITT-FFFF).
 * - QR estático do Manual de Padrões para Iniciação do Pix (BCB):
 *   chave aleatória 123e4567-e12b-12d1-a456-426655440000, recebedor
 *   "Fulano de Tal", cidade BRASILIA, txid ***, CRC 0x1D3D.
 */
const OFFICIAL_STATIC_BODY =
  "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000" +
  "5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";

const OFFICIAL_STATIC =
  `${OFFICIAL_STATIC_BODY}1D3D`;

describe("crc16CcittFalse", () => {
  test("matches the classic 123456789 vector (0x29B1)", () => {
    expect(crc16CcittFalse("123456789")).toBe("29B1");
  });

  test("matches the official static Pix CRC 0x1D3D including the 6304 suffix", () => {
    expect(crc16CcittFalse(OFFICIAL_STATIC_BODY)).toBe("1D3D");
    expect(assertPixCrc(OFFICIAL_STATIC)).toBe(true);
    expect(assertPixCrc(OFFICIAL_STATIC.replace("BRASILIA", "BRASILIa"))).toBe(false);
  });
});

describe("buildStaticPixPayload", () => {
  test("reproduces the official BCB static QR example", () => {
    expect(
      buildStaticPixPayload({
        key: "123e4567-e12b-12d1-a456-426655440000",
        merchantName: "Fulano de Tal",
        merchantCity: "BRASILIA",
        txid: "***",
      }),
    ).toBe(OFFICIAL_STATIC);
  });

  test("includes the installment amount and a sanitized identifier", () => {
    const payload = buildStaticPixPayload({
      key: "52998224725",
      merchantName: "Agência São José",
      merchantCity: "Taubaté",
      amountCents: 15000,
      txid: installmentTxid("2c9a3758-6823-408a-bb63-cb41d05351d2"),
    });
    expect(payload).toContain("5406150.00");
    expect(payload).toContain("BR5916Agencia Sao Jose");
    expect(payload).toContain("6007Taubate");
    expect(assertPixCrc(payload)).toBe(true);
    expect(formatPixAmount(15000)).toBe("150.00");
  });
});
