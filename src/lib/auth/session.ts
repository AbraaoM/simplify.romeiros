import "server-only";
import { headers } from "next/headers";
import { getAuth, isAuthConfigured } from "@/lib/auth/server";

/** Session presence only — does not resolve or invent an agency. */
export async function peekAuthenticatedSubject(): Promise<string | null> {
  if (!isAuthConfigured()) return null;
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
