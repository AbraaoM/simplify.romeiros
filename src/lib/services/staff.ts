import "server-only";
import { NAME, SITE_URL } from "@/lib/brand";
import {
  INVITE_TTL_DAYS,
  generateInviteToken,
  hashInviteToken,
} from "@/lib/domain/invites";
import {
  insertAgencyInvite,
  listAgencyInvites,
  listAgencyMembers,
  revokePendingInvite,
  revokeStaffMembership,
  type AgencyInviteRow,
  type AgencyMemberRow,
} from "@/lib/repositories/invites";
import { resolveTenantContext, requireOwner } from "@/lib/security/context";
import {
  DB_OFF,
  NOT_FOUND,
  OWNER_ONLY,
  SAVE_FAILED,
  SESSION_REQUIRED,
  SecurityError,
  isSecurityError,
} from "@/lib/security/errors";
import type { ServiceResult } from "@/lib/services/commands";

function deny(error: unknown): { ok: false; message: string } {
  if (error instanceof SecurityError) {
    if (error.code === "unauthenticated" || error.code === "unconfigured") {
      return { ok: false, message: SESSION_REQUIRED };
    }
    if (error.code === "database") {
      return { ok: false, message: DB_OFF };
    }
    if (error.code === "forbidden") {
      return { ok: false, message: error.message || OWNER_ONLY };
    }
    return { ok: false, message: SESSION_REQUIRED };
  }
  console.error("Falha ao ler o banco.");
  return { ok: false, message: SAVE_FAILED };
}

function fail(error: unknown): { ok: false; message: string } {
  if (isSecurityError(error)) return deny(error);
  console.error("Falha ao gravar no banco.");
  return { ok: false, message: SAVE_FAILED };
}

export function inviteLink(token: string): string {
  return `${SITE_URL}/convite/${token}`;
}

export function inviteWhatsAppUrl(agencyName: string, token: string): string {
  const url = inviteLink(token);
  const message = `Olá! Você foi convidado para usar o ${NAME} na agência ${agencyName}. Abra o convite (válido por ${INVITE_TTL_DAYS} dias): ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export type CreatedInvite = {
  expiresAt: string;
  url: string;
  whatsappUrl: string;
  token: string;
};

export async function createStaffInvite(agencyName: string): Promise<ServiceResult<CreatedInvite>> {
  try {
    const context = await resolveTenantContext();
    requireOwner(context);
    const token = generateInviteToken();
    const created = await insertAgencyInvite(context, hashInviteToken(token));
    return {
      ok: true,
      expiresAt: created.expiresAt,
      url: inviteLink(token),
      whatsappUrl: inviteWhatsAppUrl(agencyName, token),
      token,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function loadStaffAdmin(): Promise<
  | { ok: true; invites: AgencyInviteRow[]; members: AgencyMemberRow[] }
  | { ok: false; message: string }
> {
  try {
    const context = await resolveTenantContext();
    requireOwner(context);
    const [invites, members] = await Promise.all([
      listAgencyInvites(context),
      listAgencyMembers(context),
    ]);
    return { ok: true, invites, members };
  } catch (error) {
    return deny(error);
  }
}

export async function revokeStaff(userId: string): Promise<ServiceResult> {
  try {
    const context = await resolveTenantContext();
    requireOwner(context);
    const revoked = await revokeStaffMembership(context, userId);
    if (!revoked) {
      return { ok: false, message: NOT_FOUND };
    }
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function revokeInvite(inviteId: string): Promise<ServiceResult> {
  try {
    const context = await resolveTenantContext();
    requireOwner(context);
    if (!UUID_RE.test(inviteId)) {
      return { ok: false, message: NOT_FOUND };
    }
    const revoked = await revokePendingInvite(context, inviteId);
    if (!revoked) {
      return { ok: false, message: NOT_FOUND };
    }
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
