import { afterEach, describe, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getSql } from "./client";
import { loadAgencyData } from "./source";
import { saveAgency } from "@/lib/services/commands";
const old = process.env.DATABASE_URL;
afterEach(() => { if (old === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = old; vi.restoreAllMocks(); });
describe("barreira real de DB, sem conexão", () => {
  test("demo continua sem DATABASE_URL", async () => {
    delete process.env.DATABASE_URL;
    expect(getSql()).toBeNull();
    const result = await loadAgencyData("2026-11-09");
    expect(result.ok && result.source).toBe("example");
    expect((await saveAgency({ name: "Fictícia", phone: "", city: "" })).ok).toBe(false);
  });
  test("qualquer DATABASE_URL falha fechada sem construir cliente nem retornar demo", async () => {
    process.env.DATABASE_URL = "invalid-fixture-not-a-credential";
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => getSql()).toThrow(/bloqueado/);
    expect(await loadAgencyData("2026-11-09")).toEqual({ ok: false, error: "database" });
    expect((await saveAgency({ name: "Fictícia", phone: "", city: "" })).ok).toBe(false);
  });
});
