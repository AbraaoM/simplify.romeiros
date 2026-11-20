import "server-only";
import { getSql, type Sql } from "@/lib/db/client";
import {
  sanitizeAuditPayload,
  type AuditAction,
  type AuditEntity,
  type AuditPayload,
} from "@/lib/domain/audit";
import {
  assertTenantContext,
  type TenantContext,
} from "@/lib/security/context";

function sqlOrThrow(): Sql {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL ausente");
  return sql;
}

export async function insertAuditLog(
  context: TenantContext,
  input: {
    action: AuditAction;
    entity: AuditEntity;
    entityId: string;
    payload?: AuditPayload | Record<string, unknown>;
  },
): Promise<string> {
  const verified = assertTenantContext(context);
  const sql = sqlOrThrow();
  const payload = sanitizeAuditPayload(input.payload ?? {});
  const rows = (await sql`
    insert into audit_log (agency_id, user_id, action, entity, entity_id, payload)
    values (
      ${verified.agencyId},
      ${verified.subjectId},
      ${input.action},
      ${input.entity},
      ${input.entityId},
      ${JSON.stringify(payload)}::jsonb
    )
    returning id
  `) as Array<{ id: string }>;
  const id = rows[0]?.id;
  if (!id) throw new Error("Falha ao registrar auditoria.");
  return String(id);
}

export type AuditLogRow = {
  id: string;
  agencyId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  payload: AuditPayload;
  createdAt: string;
};

export async function listAuditLog(
  context: TenantContext,
): Promise<AuditLogRow[]> {
  const verified = assertTenantContext(context);
  const sql = sqlOrThrow();
  const rows = (await sql`
    select id, agency_id, user_id, action, entity, entity_id, payload, created_at
    from audit_log
    where agency_id = ${verified.agencyId}
    order by created_at desc
  `) as Array<{
    id: string;
    agency_id: string;
    user_id: string;
    action: string;
    entity: string;
    entity_id: string;
    payload: unknown;
    created_at: Date | string;
  }>;
  return rows.map((row) => ({
    id: String(row.id),
    agencyId: String(row.agency_id),
    userId: String(row.user_id),
    action: row.action,
    entity: row.entity,
    entityId: String(row.entity_id),
    payload: sanitizeAuditPayload(
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {},
    ),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  }));
}
