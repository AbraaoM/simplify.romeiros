import { expect, test } from "vitest";
import { isActiveExcursion } from "./active";

test("lists open and closed trips on the dashboard", () => {
  expect(isActiveExcursion("open")).toBe(true);
  expect(isActiveExcursion("closed")).toBe(true);
  expect(isActiveExcursion("draft")).toBe(false);
  expect(isActiveExcursion("completed")).toBe(false);
  expect(isActiveExcursion("cancelled")).toBe(false);
});
