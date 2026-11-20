import { createHash, randomBytes } from "node:crypto";

export const INVITE_TTL_DAYS = 7;

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function inviteExpiresAt(from = new Date(), days = INVITE_TTL_DAYS): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isInviteExpired(expiresAt: Date | string, now = new Date()): boolean {
  const expires = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return expires.getTime() <= now.getTime();
}

export const INVITE_INVALID = "Este convite é inválido ou já foi usado.";
export const INVITE_EXPIRED = "Este convite expirou. Peça um novo ao dono da agência.";
export const INVITE_ALREADY_MEMBER =
  "Esta conta já está vinculada a uma agência.";
export const INVITE_REQUIRED = "Informe o convite.";
