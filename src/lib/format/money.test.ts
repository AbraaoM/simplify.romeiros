import { expect, test } from "vitest";
import { formatBrl } from "./money";

function normalize(value: string) {
  return value.replace(/[\u00a0\u202f]/g, " ");
}

test("formats cents as Brazilian reais", () => {
  expect(normalize(formatBrl(15000))).toBe("R$ 150,00");
  expect(normalize(formatBrl(123456))).toBe("R$ 1.234,56");
  expect(normalize(formatBrl(0))).toBe("R$ 0,00");
});
