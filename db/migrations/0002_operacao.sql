-- 0002: chave Pix da agência, layouts de veículo e CPF único por excursão.
-- Incremental sobre 0001. Não aplicar no branch main de produção desta sessão.

alter table agencies
  add column if not exists pix_key text,
  add column if not exists pix_key_type text;

alter table agencies drop constraint if exists agencies_pix_key_type_check;
alter table agencies
  add constraint agencies_pix_key_type_check
  check (
    pix_key_type is null
    or pix_key_type in ('cpf', 'cnpj', 'email', 'phone', 'evp')
  );

alter table agencies drop constraint if exists agencies_pix_key_presence_check;
alter table agencies
  add constraint agencies_pix_key_presence_check
  check (
    (pix_key is null and pix_key_type is null)
    or (pix_key is not null and pix_key_type is not null)
  );

alter table excursions
  add column if not exists vehicle_layout text not null default 'coach_2_2';

alter table excursions drop constraint if exists excursions_vehicle_layout_check;
alter table excursions
  add constraint excursions_vehicle_layout_check
  check (vehicle_layout in ('coach_2_2', 'coach_46', 'coach_50', 'van_15'));

alter table seats drop constraint if exists seats_side_check;
alter table seats
  add constraint seats_side_check check (side in ('left', 'right', 'center'));

alter table seats drop constraint if exists seats_position_check;
alter table seats
  add constraint seats_position_check check (position in ('window', 'aisle', 'middle'));

create unique index if not exists passengers_unique_cpf_per_excursion_idx
  on passengers (agency_id, excursion_id, document_number)
  where document_type = 'cpf'
    and document_number is not null
    and status <> 'cancelled';
