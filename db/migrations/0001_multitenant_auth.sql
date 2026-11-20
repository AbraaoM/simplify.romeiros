-- Incremental multi-tenant auth for existing databases.
-- Do not run this file from agent sessions against a live database.

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

alter table agencies
  add column if not exists trial_ends_at timestamptz;

update agencies
  set trial_ends_at = created_at + interval '14 days'
  where trial_ends_at is null;

alter table agencies
  alter column trial_ends_at set default (now() + interval '14 days');

alter table agencies
  alter column trial_ends_at set not null;

create table if not exists agency_memberships (
  agency_id uuid not null references agencies (id) on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  primary key (agency_id, user_id)
);

create index if not exists agency_memberships_user_idx on agency_memberships (user_id);

create unique index if not exists agency_memberships_one_active_user_idx
  on agency_memberships (user_id)
  where status = 'active';

alter table excursions
  add constraint excursions_id_agency_key unique (id, agency_id);

create index if not exists excursions_agency_departure_idx
  on excursions (agency_id, departure_at);

-- Child tables: add agency_id, backfill from the parent excursion, then lock down.

alter table boarding_points add column if not exists agency_id uuid references agencies (id);

update boarding_points bp
set agency_id = e.agency_id
from excursions e
where e.id = bp.excursion_id
  and bp.agency_id is null;

alter table boarding_points alter column agency_id set not null;

alter table boarding_points
  add constraint boarding_points_id_agency_key unique (id, agency_id),
  add constraint boarding_points_id_excursion_agency_key unique (id, excursion_id, agency_id),
  add constraint boarding_points_excursion_agency_fk
    foreign key (excursion_id, agency_id)
    references excursions (id, agency_id) on delete cascade;

create index if not exists boarding_points_agency_excursion_idx
  on boarding_points (agency_id, excursion_id, sort_order);

alter table passengers add column if not exists agency_id uuid references agencies (id);

update passengers p
set agency_id = e.agency_id
from excursions e
where e.id = p.excursion_id
  and p.agency_id is null;

alter table passengers alter column agency_id set not null;

alter table passengers
  add constraint passengers_id_agency_key unique (id, agency_id),
  add constraint passengers_id_excursion_agency_key unique (id, excursion_id, agency_id),
  add constraint passengers_excursion_agency_fk
    foreign key (excursion_id, agency_id)
    references excursions (id, agency_id) on delete cascade,
  add constraint passengers_boarding_excursion_agency_fk
    foreign key (boarding_point_id, excursion_id, agency_id)
    references boarding_points (id, excursion_id, agency_id);

create index if not exists passengers_agency_excursion_idx
  on passengers (agency_id, excursion_id, status);

alter table seats add column if not exists agency_id uuid references agencies (id);

update seats s
set agency_id = e.agency_id
from excursions e
where e.id = s.excursion_id
  and s.agency_id is null;

alter table seats alter column agency_id set not null;

alter table seats
  add constraint seats_id_agency_key unique (id, agency_id),
  add constraint seats_excursion_agency_fk
    foreign key (excursion_id, agency_id)
    references excursions (id, agency_id) on delete cascade,
  add constraint seats_passenger_excursion_agency_fk
    foreign key (passenger_id, excursion_id, agency_id)
    references passengers (id, excursion_id, agency_id) on delete set null;

create index if not exists seats_agency_excursion_idx
  on seats (agency_id, excursion_id, seat_number);

alter table installments add column if not exists agency_id uuid references agencies (id);

update installments i
set agency_id = e.agency_id
from excursions e
where e.id = i.excursion_id
  and i.agency_id is null;

alter table installments alter column agency_id set not null;

alter table installments
  add constraint installments_id_agency_key unique (id, agency_id),
  add constraint installments_excursion_agency_fk
    foreign key (excursion_id, agency_id)
    references excursions (id, agency_id) on delete cascade,
  add constraint installments_passenger_excursion_agency_fk
    foreign key (passenger_id, excursion_id, agency_id)
    references passengers (id, excursion_id, agency_id) on delete cascade;

create index if not exists installments_agency_due_idx
  on installments (agency_id, status, due_date);
create index if not exists installments_agency_excursion_idx
  on installments (agency_id, excursion_id, status, due_date);

alter table rooms add column if not exists agency_id uuid references agencies (id);

update rooms r
set agency_id = e.agency_id
from excursions e
where e.id = r.excursion_id
  and r.agency_id is null;

alter table rooms alter column agency_id set not null;

alter table rooms
  add constraint rooms_id_agency_key unique (id, agency_id),
  add constraint rooms_excursion_agency_fk
    foreign key (excursion_id, agency_id)
    references excursions (id, agency_id) on delete cascade;

create index if not exists rooms_agency_excursion_idx on rooms (agency_id, excursion_id);

alter table room_assignments add column if not exists agency_id uuid references agencies (id);

update room_assignments a
set agency_id = r.agency_id
from rooms r
where r.id = a.room_id
  and a.agency_id is null;

alter table room_assignments alter column agency_id set not null;

alter table room_assignments
  add constraint room_assignments_id_agency_key unique (id, agency_id),
  add constraint room_assignments_room_agency_fk
    foreign key (room_id, agency_id)
    references rooms (id, agency_id) on delete cascade,
  add constraint room_assignments_passenger_agency_fk
    foreign key (passenger_id, agency_id)
    references passengers (id, agency_id) on delete cascade;

create index if not exists room_assignments_agency_idx on room_assignments (agency_id);
