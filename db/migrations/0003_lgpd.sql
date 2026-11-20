-- 0003: auditoria LGPD, convites de staff e anonimização de passageiro.
-- Incremental sobre 0002. Não aplicar no branch main de produção desta sessão.

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  user_id text not null,
  action text not null
    check (action in (
      'export_passenger',
      'anonymize_passenger',
      'import_csv',
      'export_antt',
      'mark_paid'
    )),
  entity text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, agency_id)
);

create index if not exists audit_log_agency_created_idx
  on audit_log (agency_id, created_at desc);

create table if not exists agency_invites (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  created_by text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by text,
  created_at timestamptz not null default now(),
  unique (id, agency_id),
  check (accepted_at is null or accepted_by is not null)
);

create index if not exists agency_invites_agency_idx
  on agency_invites (agency_id, created_at desc);

alter table passengers
  add column if not exists anonymized_at timestamptz;
