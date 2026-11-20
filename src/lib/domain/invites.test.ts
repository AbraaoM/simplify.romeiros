import { expect, test } from "vitest";
import {
  generateInviteToken,
  hashInviteToken,
  inviteExpiresAt,
  isInviteExpired,
} from "./invites";

test("hashes a token without storing the raw value", () => {
  const token = generateInviteToken();
  expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
  const hash = hashInviteToken(token);
  expect(hash).toMatch(/^[a-f0-9]{64}$/);
  expect(hash).not.toBe(token);
  expect(hashInviteToken(token)).toBe(hash);
  expect(hashInviteToken(`${token}x`)).not.toBe(hash);
});

test("expires after seven days", () => {
  const now = new Date("2026-11-20T13:00:00-03:00");
  const expires = inviteExpiresAt(now);
  expect(isInviteExpired(expires, now)).toBe(false);
  expect(isInviteExpired(expires, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))).toBe(true);
  expect(
    isInviteExpired(expires, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)),
  ).toBe(false);
});
