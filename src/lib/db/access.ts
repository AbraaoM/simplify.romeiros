/**
 * O gate fail-closed temporário (requireDatabaseAccess) foi substituído pelo
 * contrato em docs/security-context.md: toda leitura e escrita de dados da
 * agência passa por resolveTenantContext() — sessão Better Auth validada e
 * exatamente um vínculo ativo. getSql() só constrói o cliente; não autoriza.
 */
export {};
