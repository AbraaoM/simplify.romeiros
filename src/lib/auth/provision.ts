import "server-only";
import { getSql } from "@/lib/db/client";
import { PRICING } from "@/lib/brand";
import { SecurityError } from "@/lib/security/errors";

export async function provisionOwnerAgency(input: {
  userId: string;
  agencyName: string;
}): Promise<{ agencyId: string; trialEndsAt: string }> {
  const sql = getSql();
  if (!sql) {
    throw new SecurityError("database", "DATABASE_URL ausente");
  }

  const trialDays = PRICING.trialDays;
  const inserted = (await sql`
    with agency as (
      insert into agencies (name, trial_ends_at)
      values (${input.agencyName}, now() + (${trialDays}::integer * interval '1 day'))
      returning id, trial_ends_at
    ),
    membership as (
      insert into agency_memberships (agency_id, user_id, role, status)
      select id, ${input.userId}, 'owner', 'active'
      from agency
      returning agency_id
    )
    select agency.id, agency.trial_ends_at
    from agency
  `) as Array<{ id: string; trial_ends_at: Date | string }>;

  const row = inserted[0];
  if (!row) {
    throw new Error("Falha ao criar a agência.");
  }

  const trialEndsAt =
    row.trial_ends_at instanceof Date
      ? row.trial_ends_at.toISOString()
      : String(row.trial_ends_at);

  return { agencyId: String(row.id), trialEndsAt };
}

export async function deleteOrphanUser(userId: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`delete from "user" where "id" = ${userId}`;
}
