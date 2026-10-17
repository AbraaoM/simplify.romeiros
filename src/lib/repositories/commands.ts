import "server-only";
import { NeonDbError } from "@neondatabase/serverless";
import { getSql, type Sql } from "@/lib/db/client";
import type { CoachSeat } from "@/lib/domain/commands";
import type { DocumentType, ExcursionStatus } from "@/lib/domain/types";

export class WriteConflict extends Error {}

function sqlOrThrow(): Sql {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL ausente");
  return sql;
}

function assertUuid(value: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error("Identificador inválido.");
  }
  return value;
}

export async function saveAgencyRecord(input: {
  name: string;
  phone: string | null;
  city: string | null;
}): Promise<string> {
  const sql = sqlOrThrow();
  const existing = (await sql`
    select id from agencies order by created_at asc limit 1
  `) as Array<{ id: string }>;
  const current = existing[0];
  if (current) {
    await sql`
      update agencies
      set name = ${input.name}, phone = ${input.phone}, city = ${input.city}
      where id = ${current.id}
    `;
    return String(current.id);
  }
  const inserted = (await sql`
    insert into agencies (name, phone, city)
    values (${input.name}, ${input.phone}, ${input.city})
    returning id
  `) as Array<{ id: string }>;
  return String(inserted[0].id);
}

export async function insertExcursion(input: {
  agencyId: string;
  destination: string;
  originCity: string | null;
  departureAt: string;
  returnAt: string | null;
  vehicleCapacity: number;
  seats: CoachSeat[];
  boardingNames: string[];
}): Promise<string> {
  const sql = sqlOrThrow();
  const excursionId = crypto.randomUUID();
  const statements = [
    sql`
      insert into excursions (
        id, agency_id, destination, origin_city, departure_at, return_at,
        vehicle_capacity, status
      )
      values (
        ${excursionId}, ${input.agencyId}, ${input.destination}, ${input.originCity},
        ${input.departureAt}, ${input.returnAt}, ${input.vehicleCapacity}, 'open'
      )
    `,
    ...input.boardingNames.map(
      (name, index) => sql`
        insert into boarding_points (id, excursion_id, name, sort_order)
        values (${crypto.randomUUID()}, ${excursionId}, ${name}, ${index})
      `,
    ),
    ...input.seats.map(
      (seat) => sql`
        insert into seats (
          id, excursion_id, seat_number, row_index, side, position, status
        )
        values (
          ${crypto.randomUUID()}, ${excursionId}, ${seat.seatNumber}, ${seat.rowIndex},
          ${seat.side}, ${seat.position}, 'available'
        )
      `,
    ),
  ];
  await sql.transaction(statements);
  return excursionId;
}

export async function updateExcursionRecord(input: {
  id: string;
  destination: string;
  originCity: string | null;
  departureAt: string;
  returnAt: string | null;
  status: ExcursionStatus;
}): Promise<void> {
  const sql = sqlOrThrow();
  await sql`
    update excursions
    set destination = ${input.destination},
        origin_city = ${input.originCity},
        departure_at = ${input.departureAt},
        return_at = ${input.returnAt},
        status = ${input.status}
    where id = ${input.id}
  `;
}

export async function insertBoardingPoint(
  excursionId: string,
  name: string,
): Promise<void> {
  const sql = sqlOrThrow();
  await sql`
    insert into boarding_points (excursion_id, name, sort_order)
    values (
      ${excursionId},
      ${name},
      coalesce(
        (select max(sort_order) from boarding_points where excursion_id = ${excursionId}),
        -1
      ) + 1
    )
  `;
}

export async function insertPassengerRecord(input: {
  excursionId: string;
  fullName: string;
  phone: string | null;
  documentType: DocumentType;
  documentNumber: string | null;
  documentIssuer: string | null;
  boardingPointId: string | null;
  installment: { amountCents: number; dueDate: string; sequence: number } | null;
}): Promise<string> {
  const sql = sqlOrThrow();
  const passengerId = crypto.randomUUID();
  const statements = [
    sql`
      insert into passengers (
        id, excursion_id, boarding_point_id, full_name, document_type,
        document_number, document_issuer, phone, status
      )
      values (
        ${passengerId}, ${input.excursionId}, ${input.boardingPointId}, ${input.fullName},
        ${input.documentType}, ${input.documentNumber}, ${input.documentIssuer},
        ${input.phone}, 'reserved'
      )
    `,
  ];
  if (input.installment) {
    statements.push(sql`
      insert into installments (
        id, passenger_id, excursion_id, sequence, amount_cents, due_date, status
      )
      values (
        ${crypto.randomUUID()}, ${passengerId}, ${input.excursionId},
        ${input.installment.sequence}, ${input.installment.amountCents},
        ${input.installment.dueDate}, 'pending'
      )
    `);
  }
  await sql.transaction(statements);
  return passengerId;
}

export async function updatePassengerRecord(input: {
  id: string;
  excursionId: string;
  fullName: string;
  phone: string | null;
  documentType: DocumentType;
  documentNumber: string | null;
  documentIssuer: string | null;
  boardingPointId: string | null;
}): Promise<void> {
  const sql = sqlOrThrow();
  await sql`
    update passengers
    set full_name = ${input.fullName},
        phone = ${input.phone},
        document_type = ${input.documentType},
        document_number = ${input.documentNumber},
        document_issuer = ${input.documentIssuer},
        boarding_point_id = ${input.boardingPointId}
    where id = ${input.id} and excursion_id = ${input.excursionId}
  `;
}

export async function insertInstallmentRecord(input: {
  passengerId: string;
  excursionId: string;
  sequence: number;
  amountCents: number;
  dueDate: string;
}): Promise<void> {
  const sql = sqlOrThrow();
  try {
    await sql`
      insert into installments (
        passenger_id, excursion_id, sequence, amount_cents, due_date, status
      )
      values (
        ${input.passengerId}, ${input.excursionId}, ${input.sequence},
        ${input.amountCents}, ${input.dueDate}, 'pending'
      )
    `;
  } catch (error) {
    if (error instanceof NeonDbError && error.code === "23505") throw new WriteConflict();
    throw error;
  }
}

export async function markInstallmentPaid(
  installmentId: string,
  passengerId: string,
  excursionId: string,
): Promise<boolean> {
  const sql = sqlOrThrow();
  const rows = (await sql`
    update installments
    set status = 'paid', paid_at = now(), payment_method = null
    where id = ${installmentId}
      and passenger_id = ${passengerId}
      and excursion_id = ${excursionId}
      and status = 'pending'
    returning id
  `) as Array<{ id: string }>;
  return rows.length === 1;
}

export async function applySeatChange(input: {
  excursionId: string;
  passengerId: string;
  releaseSeatId: string | null;
  occupySeatId: string | null;
}): Promise<boolean> {
  const sql = sqlOrThrow();
  const excursionId = assertUuid(input.excursionId);
  const passengerId = assertUuid(input.passengerId);
  const releaseSeatId = input.releaseSeatId ? assertUuid(input.releaseSeatId) : "";
  const occupySeatId = input.occupySeatId ? assertUuid(input.occupySeatId) : "";
  try {
    await sql.query(`
      do $body$
      declare
        released int;
        occupied int;
      begin
        if '${releaseSeatId}' <> '' then
          update seats
          set status = 'available', passenger_id = null
          where id = '${releaseSeatId}'::uuid
            and excursion_id = '${excursionId}'::uuid
            and status = 'occupied'
            and passenger_id = '${passengerId}'::uuid;
          get diagnostics released = row_count;
          if released <> 1 then
            raise exception 'seat_conflict';
          end if;
        end if;

        if '${occupySeatId}' <> '' then
          update seats
          set status = 'occupied', passenger_id = '${passengerId}'::uuid
          where id = '${occupySeatId}'::uuid
            and excursion_id = '${excursionId}'::uuid
            and status = 'available'
            and passenger_id is null;
          get diagnostics occupied = row_count;
          if occupied <> 1 then
            raise exception 'seat_conflict';
          end if;
        end if;
      end
      $body$;
    `);
    return true;
  } catch (error) {
    if (error instanceof NeonDbError && error.message.includes("seat_conflict")) {
      return false;
    }
    throw error;
  }
}

export async function cancelPassengerRecord(input: {
  excursionId: string;
  passengerId: string;
  seatId: string | null;
}): Promise<boolean> {
  const sql = sqlOrThrow();
  const excursionId = assertUuid(input.excursionId);
  const passengerId = assertUuid(input.passengerId);
  const seatId = input.seatId ? assertUuid(input.seatId) : "";
  try {
    await sql.query(`
      do $body$
      declare
        released int;
        updated int;
      begin
        if '${seatId}' <> '' then
          update seats
          set status = 'available', passenger_id = null
          where id = '${seatId}'::uuid
            and excursion_id = '${excursionId}'::uuid
            and passenger_id = '${passengerId}'::uuid
            and status = 'occupied';
          get diagnostics released = row_count;
          if released <> 1 then
            raise exception 'seat_conflict';
          end if;
        end if;

        update passengers
        set status = 'cancelled'
        where id = '${passengerId}'::uuid
          and excursion_id = '${excursionId}'::uuid
          and status <> 'cancelled';
        get diagnostics updated = row_count;
        if updated <> 1 then
          raise exception 'seat_conflict';
        end if;
      end
      $body$;
    `);
    return true;
  } catch (error) {
    if (error instanceof NeonDbError && error.message.includes("seat_conflict")) {
      return false;
    }
    throw error;
  }
}

