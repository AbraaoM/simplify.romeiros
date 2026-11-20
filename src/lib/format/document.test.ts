import { expect, test } from "vitest";
import { formatCpf, isCnpjDigits, isCpfDigits, isValidCnpj, isValidCpf } from "./document";

test("formats an 11-digit CPF and rejects other lengths", () => {
  expect(formatCpf("52998224725")).toBe("529.982.247-25");
  expect(formatCpf("900")).toBe("900");
  expect(isCpfDigits("52998224725")).toBe(true);
  expect(isCpfDigits("9000000000")).toBe(false);
  expect(isCpfDigits("9000000000a")).toBe(false);
});

test("accepts a CPF with valid check digits and rejects invalid ones", () => {
  expect(isValidCpf("529.982.247-25")).toBe(true);
  expect(isValidCpf("11144477735")).toBe(true);
  expect(isValidCpf("90000000094")).toBe(true);
  expect(isValidCpf("52998224724")).toBe(false);
  expect(isValidCpf("11111111111")).toBe(false);
  expect(isValidCpf("123")).toBe(false);
});

test("accepts a CNPJ with valid check digits", () => {
  expect(isCnpjDigits("11444777000161")).toBe(true);
  expect(isValidCnpj("11.444.777/0001-61")).toBe(true);
  expect(isValidCnpj("11444777000160")).toBe(false);
  expect(isValidCnpj("00000000000000")).toBe(false);
});
