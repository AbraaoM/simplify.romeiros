import { describe, expect, test } from "vitest";
import { normalizeBrazilPhone, normalizePixKey } from "./pix-key";

describe("normalizePixKey", () => {
  test("accepts CPF, CNPJ, email, phone and EVP keys", () => {
    expect(normalizePixKey("529.982.247-25")).toEqual({
      ok: true,
      value: { type: "cpf", key: "52998224725" },
    });
    expect(normalizePixKey("11.444.777/0001-61")).toEqual({
      ok: true,
      value: { type: "cnpj", key: "11444777000161" },
    });
    expect(normalizePixKey(" Agencia@Exemplo.COM ")).toEqual({
      ok: true,
      value: { type: "email", key: "agencia@exemplo.com" },
    });
    expect(normalizePixKey("(12) 98166-0131")).toEqual({
      ok: true,
      value: { type: "phone", key: "+5512981660131" },
    });
    expect(
      normalizePixKey("123E4567-E12B-12D1-A456-426655440000"),
    ).toEqual({
      ok: true,
      value: { type: "evp", key: "123e4567-e12b-12d1-a456-426655440000" },
    });
  });

  test("rejects an invalid key", () => {
    expect(normalizePixKey("52998224724").ok).toBe(false);
    expect(normalizePixKey("nao-e-chave").ok).toBe(false);
    expect(normalizePixKey("sem-arroba.com").ok).toBe(false);
  });
});

describe("normalizeBrazilPhone", () => {
  test("prefixes +55 when the area code is present", () => {
    expect(normalizeBrazilPhone("12981660131")).toBe("+5512981660131");
    expect(normalizeBrazilPhone("+55 12 98166-0131")).toBe("+5512981660131");
    expect(normalizeBrazilPhone("123")).toBeNull();
  });
});
