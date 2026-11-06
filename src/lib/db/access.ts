/**
 * Bloqueio temporário: ainda não existe integração de sessão verificada nem
 * escopo de agência em todas as queries. Nenhum header/body/env libera DB.
 * Remover apenas junto da integração completa descrita em docs/security-context.md.
 */
export function requireDatabaseAccess(): never {
  throw new Error("Acesso ao banco bloqueado: sessão e escopo de agência não integrados.");
}
