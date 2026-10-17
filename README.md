# Simplify — Excursões e Romarias

Parcelas, poltronas e quartos da excursão num lugar só.

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000. A interface é pensada primeiro para o celular.

Sem `DATABASE_URL`, as telas usam dados de exemplo de uma agência fictícia. A faixa no topo avisa isso.

## Banco

Postgres no Neon, com `@neondatabase/serverless`.

Crie um `.env.local` na sua máquina, fora do git, com a URL que a Neon te der:

```
DATABASE_URL=postgresql://...
```

O schema está em `db/schema.sql`. Esta versão não aplica o schema e não inventa uma connection string.

## O que esta versão mostra

- Painel do que precisa de atenção hoje
- Lista de parcelas atrasadas e das que vencem hoje
- Detalhe da excursão, com mapa simples das poltronas, passageiros e quartos
- Cadastro da agência, da excursão e do passageiro, quando o banco está ligado
- Sentar na poltrona e marcar parcela paga
- Tema claro e escuro

## O que fica para a próxima etapa

Login, Asaas, quartos editáveis, bloquear poltrona e a lista em PDF.
