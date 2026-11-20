# Caravaneiro — Excursões e Romarias

Parcelas, poltronas e quartos da excursão num lugar só.

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000. A interface é pensada primeiro para o celular.

Crie um `.env.local` na sua máquina, fora do git:

```
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
```

`BETTER_AUTH_SECRET` precisa ter pelo menos 32 caracteres. Sem essas variáveis, o
painel não usa demo: as rotas autenticadas redirecionam para `/entrar` e as
operações falham fechadas. Não aponte `DATABASE_URL` para produção à toa.

O schema completo está em `db/schema.sql`. A migração incremental está em
`db/migrations/0001_multitenant_auth.sql`. Esta versão não aplica o schema e não
inventa uma connection string. Um arquivo `.env.example` lista só os nomes das
variáveis, sem segredos.

## O que esta versão mostra

- Landing pública e páginas `/entrar` e `/cadastrar`
- Cadastro que cria usuário, agência (14 dias grátis, sem cobrança) e vínculo owner
- Painel autenticado: atenção do dia, excursões, poltronas, passageiros e parcelas
- Tema claro e escuro, com a marca Caravaneiro
- Isolamento multi-tenant: cada agência só vê e altera os próprios dados

## O que fica para a próxima etapa

Asaas, quartos editáveis, bloquear poltrona, lista em PDF, convite de equipe e
revisão LGPD mais completa.

## Segurança

O contexto da agência é resolvido só no servidor, a partir da sessão Better Auth
e do vínculo ativo. Contrato: `docs/security-context.md`.
