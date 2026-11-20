import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => {
    const headers = new Headers();
    headers.set("x-agency-id", "should-never-be-used");
    return headers;
  },
}));

const getSession = vi.fn();
const sql = vi.fn();

vi.mock("@/lib/auth/server", () => ({
  isAuthConfigured: () => true,
  getAuth: () => ({
    api: { getSession },
  }),
}));

vi.mock("@/lib/db/client", () => ({
  getSql: () => sql,
}));

import {
  assertTenantContext,
  createTestTenantContext,
  resolveTenantContext,
} from "./context";
import { SecurityError } from "./errors";

afterEach(() => {
  getSession.mockReset();
  sql.mockReset();
});

describe("resolveTenantContext", () => {
  test("rejeita objeto {agencyId} forjado pelo chamador", () => {
    expect(() => assertTenantContext({ agencyId: "agency-B" })).toThrow(
      SecurityError,
    );
  });

  test("aceita apenas contexto criado pelo módulo", () => {
    const context = createTestTenantContext({
      subjectId: "user-A",
      sessionId: "sess-A",
      agencyId: "agency-A",
    });
    expect(assertTenantContext(context).agencyId).toBe("agency-A");
  });

  test("sem sessão falha fechado", async () => {
    getSession.mockResolvedValue(null);
    await expect(resolveTenantContext()).rejects.toMatchObject({
      code: "unauthenticated",
    });
    expect(sql).not.toHaveBeenCalled();
  });

  test("sessão expirada falha fechado", async () => {
    getSession.mockResolvedValue({
      user: { id: "user-A" },
      session: { id: "sess-A", expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(resolveTenantContext()).rejects.toMatchObject({
      code: "unauthenticated",
    });
    expect(sql).not.toHaveBeenCalled();
  });

  test("sem vínculo ativo falha fechado", async () => {
    getSession.mockResolvedValue({
      user: { id: "user-A" },
      session: { id: "sess-A", expiresAt: new Date(Date.now() + 60_000) },
    });
    sql.mockResolvedValue([]);
    await expect(resolveTenantContext()).rejects.toMatchObject({
      code: "no_membership",
    });
  });

  test("dois vínculos ativos não escolhem a primeira agência", async () => {
    getSession.mockResolvedValue({
      user: { id: "user-A" },
      session: { id: "sess-A", expiresAt: new Date(Date.now() + 60_000) },
    });
    sql.mockResolvedValue([
      { agency_id: "agency-A", role: "owner" },
      { agency_id: "agency-B", role: "staff" },
    ]);
    await expect(resolveTenantContext()).rejects.toMatchObject({
      code: "ambiguous_membership",
    });
  });

  test("resolve agência só pelo vínculo da sessão, ignorando header", async () => {
    getSession.mockResolvedValue({
      user: { id: "user-A" },
      session: { id: "sess-A", expiresAt: new Date(Date.now() + 60_000) },
    });
    sql.mockResolvedValue([{ agency_id: "agency-A", role: "owner" }]);
    const context = await resolveTenantContext();
    expect(context.agencyId).toBe("agency-A");
    expect(context.subjectId).toBe("user-A");
    expect(context.sessionId).toBe("sess-A");
    expect(context.role).toBe("owner");
    expect(sql).toHaveBeenCalledOnce();
    const query = String(sql.mock.calls[0]?.[0] ?? sql.mock.calls[0]);
    // The header value must never appear in the membership lookup.
    const values = sql.mock.calls[0]?.slice(1) ?? [];
    expect(values).not.toContain("should-never-be-used");
    expect(JSON.stringify(sql.mock.calls)).not.toContain("should-never-be-used");
    void query;
  });
});
