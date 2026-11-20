import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

const getSession = vi.fn();

vi.mock("@/lib/auth/server", () => ({
  isAuthConfigured: () =>
    Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET),
  getAuth: () => ({
    api: { getSession },
  }),
}));

import { getSql } from "./client";
import { loadAgencyData } from "./source";
import { saveAgency } from "@/lib/services/commands";

const oldUrl = process.env.DATABASE_URL;
const oldSecret = process.env.BETTER_AUTH_SECRET;

afterEach(() => {
  if (oldUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = oldUrl;
  if (oldSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
  else process.env.BETTER_AUTH_SECRET = oldSecret;
  getSession.mockReset();
  vi.restoreAllMocks();
});

describe("acesso ao banco após o contrato de sessão", () => {
  test("sem DATABASE_URL o cliente não é criado e as operações falham fechadas", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.BETTER_AUTH_SECRET;
    expect(getSql()).toBeNull();
    expect(await loadAgencyData()).toEqual({ ok: false, error: "unauthenticated" });
    expect((await saveAgency({ name: "Fictícia", phone: "", city: "" })).ok).toBe(
      false,
    );
  });

  test("com URL, sem sessão, a leitura e a escrita falham fechadas e não caem em demo", async () => {
    process.env.DATABASE_URL = "postgresql://invalid-fixture/not-a-real-db";
    process.env.BETTER_AUTH_SECRET = "test-secret-not-for-production-use-32c";
    getSession.mockResolvedValue(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const client = getSql();
    expect(client).not.toBeNull();
    expect(await loadAgencyData()).toEqual({ ok: false, error: "unauthenticated" });
    const saved = await saveAgency({ name: "Fictícia", phone: "", city: "" });
    expect(saved.ok).toBe(false);
    if (!saved.ok) expect(saved.message).toMatch(/entre novamente/i);
  });
});
