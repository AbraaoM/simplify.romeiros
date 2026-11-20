import "server-only";
import { getSql, type Sql } from "@/lib/db/client";
import { ANONYMIZED_DISPLAY_NAME } from "@/lib/domain/lgpd";
import {
  assertTenantContext,
  requireOwner,
  type TenantContext,
} from "@/lib/security/context";
function sqlOrThrow(): Sql {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL ausente");
  return sql;
}

function assertUuid(value: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error("Identificador inválido.");
  }
  return value;
}

export async function findScopedPassenger(
  context: TenantContext,
  passengerId: string,
  excursionId: string,
): Promise<{ id: string; anonymizedAt: string | null } | null> {
  const verified = assertTenantContext(context);
  const sql = sqlOrThrow();
  const id = assertUuid(passengerId);
  const tripId = assertUuid(excursionId);
  const rows = (await sql`
    select id, anonymized_at
    from passengers
    where id = ${id}
      and excursion_id = ${tripId}
      and agency_id = ${verified.agencyId}
    limit 1
  `) as Array<{ id: string; anonymized_at: Date | string | null }>;
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    anonymizedAt: row.anonymized_at
      ? row.anonymized_at instanceof Date
        ? row.anonymized_at.toISOString()
        : String(row.anonymized_at)
      : null,
  };
}

export async function anonymizePassengerRecord(
  context: TenantContext,
  input: { passengerId: string; excursionId: string },
): Promise<{ ok: true } | { ok: false; reason: "missing" | "already" }> {
  const verified = requireOwner(context);
  const sql = sqlOrThrow();
  const passengerId = assertUuid(input.passengerId);
  const excursionId = assertUuid(input.excursionId);

  const existing = (await sql`
    select id, anonymized_at
    from passengers
    where id = ${passengerId}
      and excursion_id = ${excursionId}
      and agency_id = ${verified.agencyId}
    limit 1
  `) as Array<{ id: string; anonymized_at: Date | string | null }>;
  const row = existing[0];
  if (!row) return { ok: false, reason: "missing" };
  if (row.anonymized_at) return { ok: false, reason: "already" };

  const updated = (await sql`
    update passengers
    set full_name = ${ANONYMIZED_DISPLAY_NAME},
        document_number = null,
        document_issuer = null,
        phone = null,
        email = null,
        notes = null,
        anonymized_at = now()
    where id = ${passengerId}
      and excursion_id = ${excursionId}
      and agency_id = ${verified.agencyId}
      and anonymized_at is null
    returning id
  `) as Array<{ id: string }>;
  if (!updated[0]) return { ok: false, reason: "already" };
  return { ok: true };
}

