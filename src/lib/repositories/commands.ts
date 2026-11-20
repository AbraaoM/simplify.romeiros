import "server-only";
import { NeonDbError } from "@neondatabase/serverless";
import { getSql, type Sql } from "@/lib/db/client";
import type { CoachSeat } from "@/lib/domain/commands";
import type { DocumentType, ExcursionStatus } from "@/lib/domain/types";
import {
  assertTenantContext,
  type TenantContext,
} from "@/lib/security/context";
import { RecordNotFound } from "@/lib/security/errors";

export class WriteConflict extends Error {}

function sqlOrThrow(): Sql {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL ausente");
  return sql;
}

function scope(context: TenantContext): { sql: Sql; agencyId: string; subjectId: string } {
  const verified = assertTenantContext(context);
  return {
    sql: sqlOrThrow(),
    agencyId: verified.agencyId,
    subjectId: verified.subjectId,
  };
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

function requireRow<T>(rows: T[]): T {
  const row = rows[0];
  if (!row) throw new RecordNotFound();
  return row;
}

export async function saveAgencyRecord(
  context: TenantContext,
  input: {
    name: string;
    phone: string | null;
    city: string | null;
  },
): Promise<string> {
  const { sql, agencyId } = scope(context);
  const updated = (await sql`
    update agencies
    set name = ${input.name}, phone = ${input.phone}, city = ${input.city}
    where id = ${agencyId}
    returning id
  `) as Array<{ id: string }>;
  return String(requireRow(updated).id);
}

export async function insertExcursion(
  context: TenantContext,
  input: {
    destination: string;
    originCity: string | null;
    departureAt: string;
    returnAt: string | null;
    vehicleCapacity: number;
    seats: CoachSeat[];
    boardingNames: string[];
  },
): Promise<string> {
  const { sql, agencyId } = scope(context);
  const excursionId = crypto.randomUUID();
  const statements = [
    sql`
      insert into excursions (
        id, agency_id, destination, origin_city, departure_at, return_at,
        vehicle_capacity, status
      )
      select
        ${excursionId}, a.id, ${input.destination}, ${input.originCity},
        ${input.departureAt}, ${input.returnAt}, ${input.vehicleCapacity}, 'open'
      from agencies a
      where a.id = ${agencyId}
      returning id
    `,
    ...input.boardingNames.map(
      (name, index) => sql`
        insert into boarding_points (id, agency_id, excursion_id, name, sort_order)
        values (
          ${crypto.randomUUID()}, ${agencyId}, ${excursionId}, ${name}, ${index}
        )
      `,
    ),
    ...input.seats.map(
      (seat) => sql`
        insert into seats (
          id, agency_id, excursion_id, seat_number, row_index, side, position, status
        )
        values (
          ${crypto.randomUUID()}, ${agencyId}, ${excursionId}, ${seat.seatNumber},
          ${seat.rowIndex}, ${seat.side}, ${seat.position}, 'available'
        )
      `,
    ),
  ];
  const results = await sql.transaction(statements);
  const first = results[0] as Array<{ id: string }> | undefined;
  if (!first || first.length !== 1) throw new RecordNotFound();
  return excursionId;
}

export async function updateExcursionRecord(
  context: TenantContext,
  input: {
    id: string;
    destination: string;
    originCity: string | null;
    departureAt: string;
    returnAt: string | null;
    status: ExcursionStatus;
  },
): Promise<void> {
  const { sql, agencyId } = scope(context);
  const updated = (await sql`
    update excursions
    set destination = ${input.destination},
        origin_city = ${input.originCity},
        departure_at = ${input.departureAt},
        return_at = ${input.returnAt},
        status = ${input.status}
    where id = ${input.id}
      and agency_id = ${agencyId}
    returning id
  `) as Array<{ id: string }>;
  requireRow(updated);
}

export async function insertBoardingPoint(
  context: TenantContext,
  excursionId: string,
  name: string,
): Promise<void> {
  const { sql, agencyId } = scope(context);
  const inserted = (await sql`
    insert into boarding_points (excursion_id, agency_id, name, sort_order)
    select
      e.id,
      e.agency_id,
      ${name},
      coalesce(
        (
          select max(bp.sort_order)
          from boarding_points bp
          where bp.excursion_id = e.id
            and bp.agency_id = e.agency_id
        ),
        -1
      ) + 1
    from excursions e
    where e.id = ${excursionId}
      and e.agency_id = ${agencyId}
    returning id
  `) as Array<{ id: string }>;
  requireRow(inserted);
}

export async function insertPassengerRecord(
  context: TenantContext,
  input: {
    excursionId: string;
    fullName: string;
    phone: string | null;
    documentType: DocumentType;
    documentNumber: string | null;
    documentIssuer: string | null;
    boardingPointId: string | null;
    installment: { amountCents: number; dueDate: string; sequence: number } | null;
  },
): Promise<string> {
  const { sql, agencyId } = scope(context);
  const passengerId = crypto.randomUUID();
  const statements = [
    sql`
      insert into passengers (
        id, agency_id, excursion_id, boarding_point_id, full_name, document_type,
        document_number, document_issuer, phone, status
      )
      select
        ${passengerId}, e.agency_id, e.id, ${input.boardingPointId}, ${input.fullName},
        ${input.documentType}, ${input.documentNumber}, ${input.documentIssuer},
        ${input.phone}, 'reserved'
      from excursions e
      where e.id = ${input.excursionId}
        and e.agency_id = ${agencyId}
      returning id
    `,
  ];
  if (input.installment) {
    statements.push(sql`
      insert into installments (
        id, agency_id, passenger_id, excursion_id, sequence, amount_cents, due_date, status
      )
      values (
        ${crypto.randomUUID()}, ${agencyId}, ${passengerId}, ${input.excursionId},
        ${input.installment.sequence}, ${input.installment.amountCents},
        ${input.installment.dueDate}, 'pending'
      )
    `);
  }
  const results = await sql.transaction(statements);
  const first = results[0] as Array<{ id: string }> | undefined;
  if (!first || first.length !== 1) throw new RecordNotFound();
  return passengerId;
}

export async function updatePassengerRecord(
  context: TenantContext,
  input: {
    id: string;
    excursionId: string;
    fullName: string;
    phone: string | null;
    documentType: DocumentType;
    documentNumber: string | null;
    documentIssuer: string | null;
    boardingPointId: string | null;
  },
): Promise<void> {
  const { sql, agencyId } = scope(context);
  const updated = (await sql`
    update passengers
    set full_name = ${input.fullName},
        phone = ${input.phone},
        document_type = ${input.documentType},
        document_number = ${input.documentNumber},
        document_issuer = ${input.documentIssuer},
        boarding_point_id = ${input.boardingPointId}
    where id = ${input.id}
      and excursion_id = ${input.excursionId}
      and agency_id = ${agencyId}
    returning id
  `) as Array<{ id: string }>;
  requireRow(updated);
}

export async function insertInstallmentRecord(
  context: TenantContext,
  input: {
    passengerId: string;
    excursionId: string;
    sequence: number;
    amountCents: number;
    dueDate: string;
  },
): Promise<void> {
  const { sql, agencyId } = scope(context);
  try {
    const inserted = (await sql`
      insert into installments (
        agency_id, passenger_id, excursion_id, sequence, amount_cents, due_date, status
      )
      select
        p.agency_id, p.id, p.excursion_id, ${input.sequence},
        ${input.amountCents}, ${input.dueDate}, 'pending'
      from passengers p
      where p.id = ${input.passengerId}
        and p.excursion_id = ${input.excursionId}
        and p.agency_id = ${agencyId}
      returning id
    `) as Array<{ id: string }>;
    requireRow(inserted);
  } catch (error) {
    if (error instanceof RecordNotFound) throw error;
    if (error instanceof NeonDbError && error.code === "23505") throw new WriteConflict();
    throw error;
  }
}

export async function markInstallmentPaid(
  context: TenantContext,
  installmentId: string,
  passengerId: string,
  excursionId: string,
): Promise<boolean> {
  const { sql, agencyId } = scope(context);
  const rows = (await sql`
    update installments
    set status = 'paid', paid_at = now(), payment_method = null
    where id = ${installmentId}
      and passenger_id = ${passengerId}
      and excursion_id = ${excursionId}
      and agency_id = ${agencyId}
      and status = 'pending'
    returning id
  `) as Array<{ id: string }>;
  return rows.length === 1;
}

export async function applySeatChange(
  context: TenantContext,
  input: {
    excursionId: string;
    passengerId: string;
    releaseSeatId: string | null;
    occupySeatId: string | null;
  },
): Promise<boolean> {
  const { sql, agencyId } = scope(context);
  const excursionId = assertUuid(input.excursionId);
  const passengerId = assertUuid(input.passengerId);
  const scopedAgencyId = assertUuid(agencyId);
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
            and agency_id = '${scopedAgencyId}'::uuid
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
            and agency_id = '${scopedAgencyId}'::uuid
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

export async function cancelPassengerRecord(
  context: TenantContext,
  input: {
    excursionId: string;
    passengerId: string;
    seatId: string | null;
  },
): Promise<boolean> {
  const { sql, agencyId } = scope(context);
  const excursionId = assertUuid(input.excursionId);
  const passengerId = assertUuid(input.passengerId);
  const scopedAgencyId = assertUuid(agencyId);
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
            and agency_id = '${scopedAgencyId}'::uuid
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
          and agency_id = '${scopedAgencyId}'::uuid
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
