import "server-only";
import { cache } from "react";
import type { AgencyData } from "@/lib/domain/types";
import { readAgencyFromDatabase } from "@/lib/repositories/agency";
import { resolveTenantContext } from "@/lib/security/context";
import { SecurityError } from "@/lib/security/errors";

export type DataSource = "database";

export type LoadError = "database" | "unauthenticated" | "forbidden";

export type LoadResult<T> =
  | { ok: true; source: DataSource; data: T }
  | { ok: false; error: LoadError };

function mapError(error: unknown): LoadError {
  if (error instanceof SecurityError) {
    if (error.code === "unauthenticated" || error.code === "unconfigured") {
      return "unauthenticated";
    }
    if (error.code === "no_membership" || error.code === "ambiguous_membership") {
      return "forbidden";
    }
  }
  return "database";
}

export const loadAgencyData = cache(
  async (): Promise<LoadResult<AgencyData>> => {
    try {
      const context = await resolveTenantContext();
      return {
        ok: true,
        source: "database",
        data: await readAgencyFromDatabase(context),
      };
    } catch (error) {
      const mapped = mapError(error);
      if (mapped === "database") {
        console.error("Falha ao ler o banco.");
      }
      return { ok: false, error: mapped };
    }
  },
);
