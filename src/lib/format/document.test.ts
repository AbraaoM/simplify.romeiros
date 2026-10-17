import { expect, test } from "vitest";
import { formatCpf, isCpfDigits } from "./document";

test("formats an 11-digit CPF and rejects other lengths", () => {
  expect(formatCpf("90000000001")).toBe("900.000.000-01");
  expect(formatCpf("900")).toBe("900");
  expect(isCpfDigits("90000000001")).toBe(true);
  expect(isCpfDigits("9000000000")).toBe(false);
  expect(isCpfDigits("9000000000a")).toBe(false);
});
