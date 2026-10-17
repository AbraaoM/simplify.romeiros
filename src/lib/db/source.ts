import "server-only";
import { cache } from "react";
import type { AgencyData } from "@/lib/domain/types";
import { buildExample } from "@/lib/fixtures/example";
import { readAgencyFromDatabase } from "@/lib/repositories/agency";

export type DataSource = "example" | "database";

export type LoadResult<T> =
  | { ok: true; source: DataSource; data: T }
  | { ok: false; error: "database" };

export const loadAgencyData = cache(
  async (today: string): Promise<LoadResult<AgencyData>> => {
    if (!process.env.DATABASE_URL) {
      return { ok: true, source: "example", data: buildExample(today) };
    }

    try {
      return {
        ok: true,
        source: "database",
        data: await readAgencyFromDatabase(),
      };
    } catch {
      console.error("Falha ao ler o banco.");
      return { ok: false, error: "database" };
    }
  },
);
