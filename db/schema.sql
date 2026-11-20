-- Simplify NV1 / Caravaneiro. Apply with your own Neon connection.
-- Do not run this file from agent sessions against a live database.
-- Overdue is not stored. A pending installment is overdue when due_date is before today in America/Sao_Paulo.
-- Auth tables use quoted camelCase because Better Auth queries those names.

create extension if not exists pgcrypto;

create table if not exists "user" (
  "id" text not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create table if not exists "session" (
  "id" text not null primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

create table if not exists "account" (
  "id" text not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null
);

create table if not exists "verification" (
  "id" text not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create index if not exists "session_userId_idx" on "session" ("userId");
create index if not exists "account_userId_idx" on "account" ("userId");
create index if not exists "verification_identifier_idx" on "verification" ("identifier");

create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  city text,
  notes text,
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active membership per user in this phase: context must not pick a "first" agency.
create table agency_memberships (
  agency_id uuid not null references agencies (id) on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  primary key (agency_id, user_id)
);

create index agency_memberships_user_idx on agency_memberships (user_id);
create unique index agency_memberships_one_active_user_idx
  on agency_memberships (user_id)
  where status = 'active';

create table excursions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id),
  destination text not null,
  origin_city text,
  departure_at timestamptz not null,
  return_at timestamptz,
  vehicle_capacity integer not null
    check (vehicle_capacity > 0 and vehicle_capacity <= 80),
  vehicle_label text,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'closed', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, agency_id),
  check (return_at is null or return_at >= departure_at)
);

create index excursions_agency_departure_idx
  on excursions (agency_id, departure_at);
create index excursions_status_departure_idx
  on excursions (status, departure_at);

create table boarding_points (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id),
  excursion_id uuid not null,
  name text not null,
  address text,
  depart_at timestamptz,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, agency_id),
  unique (id, excursion_id, agency_id),
  foreign key (excursion_id, agency_id)
    references excursions (id, agency_id) on delete cascade
);

create index boarding_points_agency_excursion_idx
  on boarding_points (agency_id, excursion_id, sort_order);

create table passengers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id),
  excursion_id uuid not null,
  boarding_point_id uuid,
  full_name text not null,
  document_type text not null default 'cpf'
    check (document_type in ('cpf', 'rg', 'passport', 'other')),
  document_number text,
  document_issuer text,
  phone text,
  email text,
  status text not null default 'reserved'
    check (status in ('reserved', 'confirmed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, agency_id),
  unique (id, excursion_id, agency_id),
  foreign key (excursion_id, agency_id)
    references excursions (id, agency_id) on delete cascade,
  foreign key (boarding_point_id, excursion_id, agency_id)
    references boarding_points (id, excursion_id, agency_id)
);

create index passengers_agency_excursion_idx
  on passengers (agency_id, excursion_id, status);

create table seats (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id),
  excursion_id uuid not null,
  seat_number integer not null check (seat_number > 0),
  row_index integer not null check (row_index > 0),
  side text not null check (side in ('left', 'right')),
  position text not null check (position in ('window', 'aisle')),
  status text not null default 'available'
    check (status in ('available', 'occupied', 'blocked')),
  passenger_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, agency_id),
  unique (excursion_id, seat_number),
  unique (excursion_id, row_index, side, position),
  unique (passenger_id),
  foreign key (excursion_id, agency_id)
    references excursions (id, agency_id) on delete cascade,
  foreign key (passenger_id, excursion_id, agency_id)
    references passengers (id, excursion_id, agency_id) on delete set null,
  check (
    (status = 'occupied' and passenger_id is not null)
    or (status in ('available', 'blocked') and passenger_id is null)
  )
);

create index seats_agency_excursion_idx on seats (agency_id, excursion_id, seat_number);

create table installments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id),
  passenger_id uuid not null,
  excursion_id uuid not null,
  sequence integer not null check (sequence > 0),
  label text,
  amount_cents integer not null check (amount_cents >= 0),
  due_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'waived', 'cancelled')),
  paid_at timestamptz,
  payment_method text
    check (
      payment_method is null
      or payment_method in ('pix', 'cash', 'boleto', 'card', 'transfer', 'other')
    ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, agency_id),
  unique (passenger_id, sequence),
  foreign key (excursion_id, agency_id)
    references excursions (id, agency_id) on delete cascade,
  foreign key (passenger_id, excursion_id, agency_id)
    references passengers (id, excursion_id, agency_id) on delete cascade,
  check (
    (status = 'paid' and paid_at is not null)
    or (status <> 'paid' and paid_at is null)
  )
);

create index installments_agency_due_idx
  on installments (agency_id, status, due_date);
create index installments_agency_excursion_idx
  on installments (agency_id, excursion_id, status, due_date);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id),
  excursion_id uuid not null,
  label text not null,
  room_type text not null default 'double'
    check (room_type in ('single', 'double', 'triple', 'quadruple', 'other')),
  capacity integer not null check (capacity > 0 and capacity <= 8),
  notes text,
  created_at timestamptz not null default now(),
  unique (id, agency_id),
  unique (excursion_id, label),
  foreign key (excursion_id, agency_id)
    references excursions (id, agency_id) on delete cascade
);

create index rooms_agency_excursion_idx on rooms (agency_id, excursion_id);

create table room_assignments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id),
  room_id uuid not null,
  passenger_id uuid not null unique,
  created_at timestamptz not null default now(),
  unique (id, agency_id),
  foreign key (room_id, agency_id)
    references rooms (id, agency_id) on delete cascade,
  foreign key (passenger_id, agency_id)
    references passengers (id, agency_id) on delete cascade
);

create index room_assignments_agency_idx on room_assignments (agency_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger agencies_set_updated_at
  before update on agencies
  for each row execute function set_updated_at();

create trigger excursions_set_updated_at
  before update on excursions
  for each row execute function set_updated_at();

create trigger passengers_set_updated_at
  before update on passengers
  for each row execute function set_updated_at();

create trigger seats_set_updated_at
  before update on seats
  for each row execute function set_updated_at();

create trigger installments_set_updated_at
  before update on installments
  for each row execute function set_updated_at();
