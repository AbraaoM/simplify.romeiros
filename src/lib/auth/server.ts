import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "@neondatabase/serverless";
import { DOMAIN, SITE_URL } from "@/lib/brand";

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL?.trim() && process.env.BETTER_AUTH_SECRET?.trim(),
  );
}

const globalAuth = globalThis as typeof globalThis & {
  __caravaneiroAuth?: { key: string; instance: ReturnType<typeof createAuth> };
};

function authBaseURL(): string {
  const fromEnv = process.env.BETTER_AUTH_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return `https://${DOMAIN}`;
}

export function getAuth() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!databaseUrl || !secret) {
    throw new Error("Autenticação não configurada.");
  }

  const baseURL = authBaseURL();
  const key = `${baseURL}::${databaseUrl.length}::${secret.length}`;
  if (globalAuth.__caravaneiroAuth?.key === key) {
    return globalAuth.__caravaneiroAuth.instance;
  }

  const instance = createAuth(databaseUrl, secret, baseURL);
  globalAuth.__caravaneiroAuth = { key, instance };
  return instance;
}

function createAuth(databaseUrl: string, secret: string, baseURL: string) {
  return betterAuth({
    database: new Pool({ connectionString: databaseUrl }),
    secret,
    baseURL,
    trustedOrigins: Array.from(
      new Set([baseURL, SITE_URL, "http://localhost:3000", "http://127.0.0.1:3000"]),
    ),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      cookieCache: {
        enabled: false,
      },
    },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    },
    plugins: [nextCookies()],
  });
}
