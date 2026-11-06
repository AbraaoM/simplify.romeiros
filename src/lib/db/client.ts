import { type NeonQueryFunction } from "@neondatabase/serverless";
import "server-only";
import { requireDatabaseAccess } from "./access";

export type Sql = NeonQueryFunction<false, false>;

export function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  requireDatabaseAccess();

}
