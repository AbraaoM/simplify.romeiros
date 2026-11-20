import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { getAuth, isAuthConfigured } from "@/lib/auth/server";
import { getSql } from "@/lib/db/client";
import { SecurityError } from "./errors";

const BRAND = Symbol("tenant-context");

export type MembershipRole = "owner" | "staff";

export type TenantContext = {
  readonly [BRAND]: true;
  readonly subjectId: string;
  readonly sessionId: string;
  readonly agencyId: string;
  readonly role: MembershipRole;
};

type MembershipRow = {
  agency_id: string;
  role: string;
};

function branded(input: {
  subjectId: string;
  sessionId: string;
  agencyId: string;
  role: MembershipRole;
}): TenantContext {
  return {
    [BRAND]: true,
    subjectId: input.subjectId,
    sessionId: input.sessionId,
    agencyId: input.agencyId,
    role: input.role,
  };
}

export function assertTenantContext(value: unknown): TenantContext {
  if (!value || typeof value !== "object" || !(BRAND in value)) {
    throw new SecurityError(
      "unauthenticated",
      "Contexto de agência ausente ou inválido.",
    );
  }
  const context = value as TenantContext;
  if (!context.subjectId || !context.sessionId || !context.agencyId) {
    throw new SecurityError(
      "unauthenticated",
      "Contexto de agência ausente ou inválido.",
    );
  }
  return context;
}

/** Only for tests. Production code must go through resolveTenantContext(). */
export function createTestTenantContext(input: {
  subjectId: string;
  sessionId: string;
  agencyId: string;
  role?: MembershipRole;
}): TenantContext {
  return branded({
    subjectId: input.subjectId,
    sessionId: input.sessionId,
    agencyId: input.agencyId,
    role: input.role ?? "owner",
  });
}

/**
 * Resolves the tenant exclusively from a validated Better Auth session plus
 * the single active membership of that subject. Never reads agencyId from
 * header, body, query or URL, and never falls back to the first agency.
 */
export const resolveTenantContext = cache(async (): Promise<TenantContext> => {
  if (!isAuthConfigured()) {
    throw new SecurityError(
      "unconfigured",
      "Autenticação não configurada.",
    );
  }

  const sql = getSql();
  if (!sql) {
    throw new SecurityError("database", "DATABASE_URL ausente");
  }

  const session = await getAuth().api.getSession({
    headers: await headers(),
  });
  const subjectId = session?.user?.id;
  const sessionId = session?.session?.id;
  const expiresAt = session?.session?.expiresAt;
  if (!subjectId || !sessionId) {
    throw new SecurityError("unauthenticated", "Sessão ausente.");
  }
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    throw new SecurityError("unauthenticated", "Sessão expirada.");
  }

  const rows = (await sql`
    select agency_id, role
    from agency_memberships
    where user_id = ${subjectId}
      and status = 'active'
  `) as MembershipRow[];

  if (rows.length === 0) {
    throw new SecurityError(
      "no_membership",
      "Nenhum vínculo ativo com uma agência.",
    );
  }
  if (rows.length > 1) {
    throw new SecurityError(
      "ambiguous_membership",
      "Há mais de um vínculo ativo; o acesso foi bloqueado.",
    );
  }

  const row = rows[0];
  const role = row.role;
  if (role !== "owner" && role !== "staff") {
    throw new SecurityError(
      "no_membership",
      "Nenhum vínculo ativo com uma agência.",
    );
  }

  return branded({
    subjectId,
    sessionId,
    agencyId: String(row.agency_id),
    role,
  });
});
