# Contexto servidor — contrato implementado

## Estado deste lote

O gate temporário `requireDatabaseAccess()` foi substituído. `getSql()` apenas
constrói o cliente Neon quando `DATABASE_URL` existe; **não autoriza** leitura
nem escrita. Toda operação de dados da agência passa por `resolveTenantContext()`
(`src/lib/security/context.ts`).

O contexto é resolvido **somente no servidor**, a partir de:

1. sessão Better Auth validada (`auth.api.getSession` com os headers da requisição);
2. exatamente um vínculo **ativo** em `agency_memberships` para o `subjectId`.

Campos do contexto: `subjectId`, `sessionId`, `agencyId`, `role` (`owner` | `staff`).
O objeto é marcado com um símbolo de módulo; um `{agencyId}` enviado pelo
chamador é rejeitado em runtime. TypeScript sozinho não autentica.

Nunca se lê `agencyId` de header, body, query ou URL. Não existe fallback para a
“primeira agência” (`ORDER BY … LIMIT 1`). Zero vínculos: negação. Dois ou mais
vínculos ativos: falha fechada (`ambiguous_membership`) — nesta fase um usuário
só pode ter um vínculo ativo (índice único parcial).

Cadastro (`/cadastrar`) cria o usuário Better Auth, a agência com
`trial_ends_at = now() + 14 days` e o vínculo `owner` ativo, na mesma operação
de negócio. Sem cobrança. Login (`/entrar`) usa e-mail e senha; a sessão fica em
cookie HttpOnly, `SameSite=Lax`. Rotas do grupo `(app)` exigem sessão
(redirecionam para `/entrar`). Marketing (`/landing`, `/privacidade`) permanece
público.

Sem `DATABASE_URL` ou sem `BETTER_AUTH_SECRET`, o painel não cai em demo e não
libera banco: falha fechada. A demo fictícia (`buildExample`) fica só para
testes de projeção de views, não para o app autenticado.

## Queries e escritas

`loadAgencyData` e `readAgencyFromDatabase` filtram por `context.agencyId`.
Repositórios de comando recebem o contexto verificado, preenchem `agency_id` a
partir dele (nunca do input) e fazem escrita condicional com `RETURNING`. IDs
de outra agência resultam em “Não encontrado.”, sem vazar existência para além
dessa resposta genérica.

Mapa das Server Actions (`src/app/acoes.ts`): todas delegam aos serviços em
`src/lib/services/commands.ts`, que resolvem o contexto antes de qualquer
leitura ou escrita — inclusive `assignSeat`, `releaseSeat` e `cancelPassenger`.

## Testes e limites

- `access.test.ts`: sem sessão / sem configuração, leitura e escrita falham
  fechadas; `getSql()` sem URL retorna null; com URL fictícia o cliente pode ser
  construído, mas nenhuma query de negócio roda sem sessão.
- `security/context.test.ts`: objeto forjado rejeitado; header `x-agency-id`
  ignorado; 0 ou 2 vínculos falham fechados.
- `services/isolation.test.ts`: cada action/query sem sessão falha; agência A
  não lê nem altera dados da B; IDs da B retornam não encontrado.
- `repositories/commands-scope.test.ts`: SQL de escrita inclui `agency_id` do
  contexto e `RETURNING`.
- `schema-isolation.test.ts`: inspeciona `db/schema.sql` e
  `db/migrations/0001_multitenant_auth.sql` (não executa SQL contra banco real).
- Caracterização de concorrência (cancelamento + snapshot atrasado + atribuição)
  permanece: ainda não há prova de ordem/lock em Postgres real.

Não executar estas migrações nem seeds contra banco real a partir desta sessão.
Nenhum teste deve abrir conexão verdadeira.

## Backlog ainda aberto

1. Locks de passageiro em ordem estável na atribuição/cancelamento; revalidar
   status e assento dentro da transação. Testar interleavings num Postgres local
   descartável.
2. Consentimento não presumido: finalidade de documentos, controlador, retenção,
   auditoria mínima sem dados excessivos; revisão LGPD.
3. Testes HTTP/browser de sessão e cookie; convite de `staff`; escolha explícita
   de agência se no futuro houver mais de um vínculo.
4. No host `caravaneiro.abraaomoreira.dev`, a raiz `/` ainda é reescrita para a
   landing; o painel autenticado vive nas demais rotas do grupo `(app)`.

Sem deploy/push/PR/pagamento/envio/migração feito por este lote. A liberação de
produção depende de aplicar a migração no Neon do dono e configurar
`DATABASE_URL`, `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` fora desta sessão.
