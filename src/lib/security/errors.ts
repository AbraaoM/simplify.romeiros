export type SecurityCode =
  | "unauthenticated"
  | "no_membership"
  | "ambiguous_membership"
  | "not_found"
  | "forbidden"
  | "database"
  | "unconfigured";

export class SecurityError extends Error {
  readonly code: SecurityCode;

  constructor(code: SecurityCode, message: string) {
    super(message);
    this.name = "SecurityError";
    this.code = code;
  }
}

export class RecordNotFound extends Error {
  constructor(message = "Não encontrado.") {
    super(message);
    this.name = "RecordNotFound";
  }
}

export function isSecurityError(error: unknown): error is SecurityError {
  return error instanceof SecurityError;
}

export function isUnauthenticated(error: unknown): boolean {
  return error instanceof SecurityError && error.code === "unauthenticated";
}

export const SESSION_REQUIRED = "Entre novamente para continuar.";
export const NOT_FOUND = "Não encontrado.";
export const SAVE_FAILED = "Não foi possível salvar. Tente de novo.";
export const DB_OFF = "O banco não está ligado.";

export const OWNER_ONLY = "Apenas o dono da agência pode fazer isso.";
