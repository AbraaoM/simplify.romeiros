import "server-only";
import { NeonDbError } from "@neondatabase/serverless";
import { getSql, type Sql } from "@/lib/db/client";
import {
  INVITE_ALREADY_MEMBER,
  INVITE_EXPIRED,
  INVITE_INVALID,
  INVITE_TTL_DAYS,
  hashInviteToken,
  isInviteExpired,
} from "@/lib/domain/invites";
import {
  requireOwner,
  type TenantContext,
} from "@/lib/security/context";

function sqlOrThrow(): Sql {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL ausente");
  return sql;
}

export class InviteError extends Error {
  constructor(
    readonly kind: "invalid" | "expired" | "already_member",
    message: string,
  ) {
    super(message);
    this.name = "InviteError";
  }
}

export type AgencyInviteRow = {
  id: string;
  agencyId: string;
  createdBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedBy: string | null;
  createdAt: string;
  status: "pending" | "accepted" | "expired";
};

export type AgencyMemberRow = {
  userId: string;
  role: "owner" | "staff";
  status: "active" | "revoked";
  name: string;
  email: string;
  createdAt: string;
};

export async function insertAgencyInvite(
  context: TenantContext,
  tokenHash: string,
): Promise<{ id: string; expiresAt: string }> {
  const verified = requireOwner(context);
  const sql = sqlOrThrow();
  const rows = (await sql`
    insert into agency_invites (agency_id, created_by, token_hash, expires_at)
    values (
      ${verified.agencyId},
      ${verified.subjectId},
      ${tokenHash},
      now() + (${INVITE_TTL_DAYS}::integer * interval '1 day')
    )
    returning id, expires_at
  `) as Array<{ id: string; expires_at: Date | string }>;
  const row = rows[0];
  if (!row) throw new Error("Falha ao criar o convite.");
  return {
    id: String(row.id),
    expiresAt:
      row.expires_at instanceof Date
        ? row.expires_at.toISOString()
        : String(row.expires_at),
  };
}

export async function listAgencyInvites(
  context: TenantContext,
): Promise<AgencyInviteRow[]> {
  const verified = requireOwner(context);
  const sql = sqlOrThrow();
  const rows = (await sql`
    select
      id,
      agency_id,
      created_by,
      expires_at,
      accepted_at,
      accepted_by,
      created_at,
      case
        when accepted_at is not null then 'accepted'
        when expires_at <= now() then 'expired'
        else 'pending'
      end as status
    from agency_invites
    where agency_id = ${verified.agencyId}
    order by created_at desc
  `) as Array<{
    id: string;
    agency_id: string;
    created_by: string;
    expires_at: Date | string;
    accepted_at: Date | string | null;
    accepted_by: string | null;
    created_at: Date | string;
    status: string;
  }>;
  return rows.map((row) => ({
    id: String(row.id),
    agencyId: String(row.agency_id),
    createdBy: String(row.created_by),
    expiresAt: ts(row.expires_at),
    acceptedAt: row.accepted_at ? ts(row.accepted_at) : null,
    acceptedBy: row.accepted_by ? String(row.accepted_by) : null,
    createdAt: ts(row.created_at),
    status:
      row.status === "accepted"
        ? "accepted"
        : row.status === "expired"
          ? "expired"
          : "pending",
  }));
}

export async function listAgencyMembers(
  context: TenantContext,
): Promise<AgencyMemberRow[]> {
  const verified = requireOwner(context);
  const sql = sqlOrThrow();
  const rows = (await sql`
    select
      m.user_id,
      m.role,
      m.status,
      m.created_at,
      u."name" as name,
      u."email" as email
    from agency_memberships m
    join "user" u on u."id" = m.user_id
    where m.agency_id = ${verified.agencyId}
    order by
      case when m.role = 'owner' then 0 else 1 end,
      m.created_at asc
  `) as Array<{
    user_id: string;
    role: string;
    status: string;
    created_at: Date | string;
    name: string;
    email: string;
  }>;
  return rows.map((row) => ({
    userId: String(row.user_id),
    role: row.role === "owner" ? "owner" : "staff",
    status: row.status === "revoked" ? "revoked" : "active",
    name: row.name,
    email: row.email,
    createdAt: ts(row.created_at),
  }));
}

export async function revokeStaffMembership(
  context: TenantContext,
  userId: string,
): Promise<boolean> {
  const verified = requireOwner(context);
  if (userId === verified.subjectId) {
    return false;
  }
  const sql = sqlOrThrow();
  const rows = (await sql`
    update agency_memberships
    set status = 'revoked'
    where agency_id = ${verified.agencyId}
      and user_id = ${userId}
      and role = 'staff'
      and status = 'active'
    returning user_id
  `) as Array<{ user_id: string }>;
  return rows.length > 0;
}

export async function revokePendingInvite(
  context: TenantContext,
  inviteId: string,
): Promise<boolean> {
  const verified = requireOwner(context);
  const sql = sqlOrThrow();
  const rows = (await sql`
    delete from agency_invites
    where id = ${inviteId}::uuid
      and agency_id = ${verified.agencyId}
      and accepted_at is null
    returning id
  `) as Array<{ id: string }>;
  return rows.length > 0;
}

/**
 * Accepts an invite for a validated session subject. This path does not use
 * resolveTenantContext because the invitee has no membership yet.
 */
export async function acceptInviteForUser(
  userId: string,
  rawToken: string,
): Promise<{ agencyId: string }> {
  const sql = sqlOrThrow();
  const tokenHash = hashInviteToken(rawToken);
  const found = (await sql`
    select id, agency_id, expires_at, accepted_at
    from agency_invites
    where token_hash = ${tokenHash}
    limit 1
  `) as Array<{
    id: string;
    agency_id: string;
    expires_at: Date | string;
    accepted_at: Date | string | null;
  }>;
  const invite = found[0];
  if (!invite || invite.accepted_at) {
    throw new InviteError("invalid", INVITE_INVALID);
  }
  if (isInviteExpired(invite.expires_at)) {
    throw new InviteError("expired", INVITE_EXPIRED);
  }

  const active = (await sql`
    select agency_id
    from agency_memberships
    where user_id = ${userId}
      and status = 'active'
    limit 1
  `) as Array<{ agency_id: string }>;
  if (active.length > 0) {
    throw new InviteError("already_member", INVITE_ALREADY_MEMBER);
  }

  try {
    const accepted = (await sql`
      with claimed as (
        update agency_invites
        set accepted_at = now(),
            accepted_by = ${userId}
        where id = ${invite.id}
          and accepted_at is null
          and expires_at > now()
        returning id, agency_id
      ),
      membership as (
        insert into agency_memberships (agency_id, user_id, role, status)
        select agency_id, ${userId}, 'staff', 'active'
        from claimed
        on conflict (agency_id, user_id) do update
          set status = 'active',
              role = 'staff'
        returning agency_id
      )
      select agency_id from membership
    `) as Array<{ agency_id: string }>;
    const row = accepted[0];
    if (!row) {
      throw new InviteError("invalid", INVITE_INVALID);
    }
    return { agencyId: String(row.agency_id) };
  } catch (error) {
    if (error instanceof InviteError) throw error;
    if (error instanceof NeonDbError && error.constraint === "agency_memberships_one_active_user_idx") {
      throw new InviteError("already_member", INVITE_ALREADY_MEMBER);
    }
    throw error;
  }
}

export type InvitePreview =
  | { ok: true; agencyName: string; expiresAt: string }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export async function peekInvitePreview(rawToken: string): Promise<InvitePreview> {
  const sql = getSql();
  if (!sql) return { ok: false, reason: "invalid" };
  const tokenHash = hashInviteToken(rawToken);
  const rows = (await sql`
    select a.name, i.expires_at, i.accepted_at
    from agency_invites i
    join agencies a on a.id = i.agency_id
    where i.token_hash = ${tokenHash}
    limit 1
  `) as Array<{
    name: string;
    expires_at: Date | string;
    accepted_at: Date | string | null;
  }>;
  const row = rows[0];
  if (!row) return { ok: false, reason: "invalid" };
  if (row.accepted_at) return { ok: false, reason: "used" };
  if (isInviteExpired(row.expires_at)) return { ok: false, reason: "expired" };
  return { ok: true, agencyName: row.name, expiresAt: ts(row.expires_at) };
}

function ts(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toISOString();
}
