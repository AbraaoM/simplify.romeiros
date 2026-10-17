import type { ExcursionStatus } from "./types";

export function isActiveExcursion(status: ExcursionStatus): boolean {
  return status === "open" || status === "closed";
}
