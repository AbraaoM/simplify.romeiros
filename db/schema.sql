-- Simplify NV1. Apply with your own Neon connection.
-- Overdue is not stored. A pending installment is overdue when due_date is before today in America/Sao_Paulo.

create extension if not exists pgcrypto;

create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  city text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  check (return_at is null or return_at >= departure_at)
);

create index excursions_status_departure_idx
  on excursions (status, departure_at);

create table boarding_points (
  id uuid primary key default gen_random_uuid(),
  excursion_id uuid not null references excursions (id) on delete cascade,
  name text not null,
  address text,
  depart_at timestamptz,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index boarding_points_excursion_idx
  on boarding_points (excursion_id, sort_order);

create table passengers (
  id uuid primary key default gen_random_uuid(),
  excursion_id uuid not null references excursions (id) on delete cascade,
  boarding_point_id uuid references boarding_points (id),
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
  updated_at timestamptz not null default now()
);

create index passengers_excursion_idx
  on passengers (excursion_id, status);

create table seats (
  id uuid primary key default gen_random_uuid(),
  excursion_id uuid not null references excursions (id) on delete cascade,
  seat_number integer not null check (seat_number > 0),
  row_index integer not null check (row_index > 0),
  side text not null check (side in ('left', 'right')),
  position text not null check (position in ('window', 'aisle')),
  status text not null default 'available'
    check (status in ('available', 'occupied', 'blocked')),
  passenger_id uuid unique references passengers (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (excursion_id, seat_number),
  unique (excursion_id, row_index, side, position),
  check (
    (status = 'occupied' and passenger_id is not null)
    or (status in ('available', 'blocked') and passenger_id is null)
  )
);

create index seats_excursion_idx on seats (excursion_id, seat_number);

create table installments (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references passengers (id) on delete cascade,
  excursion_id uuid not null references excursions (id) on delete cascade,
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
  unique (passenger_id, sequence),
  check (
    (status = 'paid' and paid_at is not null)
    or (status <> 'paid' and paid_at is null)
  )
);

create index installments_due_idx
  on installments (status, due_date);

create index installments_excursion_idx
  on installments (excursion_id, status, due_date);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  excursion_id uuid not null references excursions (id) on delete cascade,
  label text not null,
  room_type text not null default 'double'
    check (room_type in ('single', 'double', 'triple', 'quadruple', 'other')),
  capacity integer not null check (capacity > 0 and capacity <= 8),
  notes text,
  created_at timestamptz not null default now(),
  unique (excursion_id, label)
);

create table room_assignments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  passenger_id uuid not null unique references passengers (id) on delete cascade,
  created_at timestamptz not null default now()
);

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
