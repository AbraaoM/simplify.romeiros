import "server-only";
import { getSql } from "@/lib/db/client";
import type {
  Agency,
  AgencyData,
  BoardingPoint,
  DocumentType,
  Excursion,
  ExcursionStatus,
  Installment,
  InstallmentStatus,
  Passenger,
  PassengerStatus,
  PaymentMethod,
  Room,
  RoomAssignment,
  RoomType,
  Seat,
  SeatPosition,
  SeatSide,
  SeatStatus,
} from "@/lib/domain/types";

type Row = Record<string, unknown>;

export async function readAgencyFromDatabase(): Promise<AgencyData> {
  const sql = getSql();
  if (!sql) {
    throw new Error("DATABASE_URL ausente");
  }

  const agencies = (await sql`
    select id, name, phone, city, notes, created_at, updated_at
    from agencies
    order by created_at asc
    limit 1
  `) as Row[];

  const agencyRow = agencies[0];
  if (!agencyRow) return emptyData();

  const agencyId = text(agencyRow.id);

  const [
    excursionRows,
    pointRows,
    passengerRows,
    seatRows,
    installmentRows,
    roomRows,
    assignmentRows,
  ] = await Promise.all([
    sql`
      select id, agency_id, destination, origin_city, departure_at, return_at,
             vehicle_capacity, vehicle_label, status, notes, created_at, updated_at
      from excursions
      where agency_id = ${agencyId}
      order by departure_at asc
    `,
    sql`
      select bp.id, bp.excursion_id, bp.name, bp.address, bp.depart_at,
             bp.sort_order, bp.notes, bp.created_at
      from boarding_points bp
      join excursions e on e.id = bp.excursion_id
      where e.agency_id = ${agencyId}
      order by bp.sort_order asc, bp.name asc
    `,
    sql`
      select p.id, p.excursion_id, p.boarding_point_id, p.full_name, p.document_type,
             p.document_number, p.document_issuer, p.phone, p.email, p.status,
             p.notes, p.created_at, p.updated_at
      from passengers p
      join excursions e on e.id = p.excursion_id
      where e.agency_id = ${agencyId}
      order by p.full_name asc
    `,
    sql`
      select s.id, s.excursion_id, s.seat_number, s.row_index, s.side, s.position,
             s.status, s.passenger_id, s.notes, s.created_at, s.updated_at
      from seats s
      join excursions e on e.id = s.excursion_id
      where e.agency_id = ${agencyId}
      order by s.seat_number asc
    `,
    sql`
      select i.id, i.passenger_id, i.excursion_id, i.sequence, i.label, i.amount_cents,
             i.due_date, i.status, i.paid_at, i.payment_method, i.notes,
             i.created_at, i.updated_at
      from installments i
      join excursions e on e.id = i.excursion_id
      where e.agency_id = ${agencyId}
      order by i.due_date asc, i.sequence asc
    `,
    sql`
      select r.id, r.excursion_id, r.label, r.room_type, r.capacity, r.notes, r.created_at
      from rooms r
      join excursions e on e.id = r.excursion_id
      where e.agency_id = ${agencyId}
      order by r.label asc
    `,
    sql`
      select a.id, a.room_id, a.passenger_id, a.created_at
      from room_assignments a
      join rooms r on r.id = a.room_id
      join excursions e on e.id = r.excursion_id
      where e.agency_id = ${agencyId}
    `,
  ]);

  return {
    agency: mapAgency(agencyRow),
    excursions: (excursionRows as Row[]).map(mapExcursion),
    boardingPoints: (pointRows as Row[]).map(mapPoint),
    passengers: (passengerRows as Row[]).map(mapPassenger),
    seats: (seatRows as Row[]).map(mapSeat),
    installments: (installmentRows as Row[]).map(mapInstallment),
    rooms: (roomRows as Row[]).map(mapRoom),
    roomAssignments: (assignmentRows as Row[]).map(mapAssignment),
  };
}

function emptyData(): AgencyData {
  return {
    agency: null,
    excursions: [],
    boardingPoints: [],
    passengers: [],
    seats: [],
    installments: [],
    rooms: [],
    roomAssignments: [],
  };
}

function mapAgency(row: Row): Agency {
  return {
    id: text(row.id),
    name: text(row.name),
    phone: nullableText(row.phone),
    city: nullableText(row.city),
    notes: nullableText(row.notes),
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  };
}

function mapExcursion(row: Row): Excursion {
  return {
    id: text(row.id),
    agencyId: text(row.agency_id),
    destination: text(row.destination),
    originCity: nullableText(row.origin_city),
    departureAt: timestamp(row.departure_at),
    returnAt: row.return_at == null ? null : timestamp(row.return_at),
    vehicleCapacity: number(row.vehicle_capacity),
    vehicleLabel: nullableText(row.vehicle_label),
    status: text(row.status) as ExcursionStatus,
    notes: nullableText(row.notes),
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  };
}

function mapPoint(row: Row): BoardingPoint {
  return {
    id: text(row.id),
    excursionId: text(row.excursion_id),
    name: text(row.name),
    address: nullableText(row.address),
    departAt: row.depart_at == null ? null : timestamp(row.depart_at),
    sortOrder: number(row.sort_order),
    notes: nullableText(row.notes),
    createdAt: timestamp(row.created_at),
  };
}

function mapPassenger(row: Row): Passenger {
  return {
    id: text(row.id),
    excursionId: text(row.excursion_id),
    boardingPointId: nullableText(row.boarding_point_id),
    fullName: text(row.full_name),
    documentType: text(row.document_type) as DocumentType,
    documentNumber: nullableText(row.document_number),
    documentIssuer: nullableText(row.document_issuer),
    phone: nullableText(row.phone),
    email: nullableText(row.email),
    status: text(row.status) as PassengerStatus,
    notes: nullableText(row.notes),
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  };
}

function mapSeat(row: Row): Seat {
  return {
    id: text(row.id),
    excursionId: text(row.excursion_id),
    seatNumber: number(row.seat_number),
    rowIndex: number(row.row_index),
    side: text(row.side) as SeatSide,
    position: text(row.position) as SeatPosition,
    status: text(row.status) as SeatStatus,
    passengerId: nullableText(row.passenger_id),
    notes: nullableText(row.notes),
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  };
}

function mapInstallment(row: Row): Installment {
  return {
    id: text(row.id),
    passengerId: text(row.passenger_id),
    excursionId: text(row.excursion_id),
    sequence: number(row.sequence),
    label: nullableText(row.label),
    amountCents: number(row.amount_cents),
    dueDate: dateOnly(row.due_date),
    status: text(row.status) as InstallmentStatus,
    paidAt: row.paid_at == null ? null : timestamp(row.paid_at),
    paymentMethod:
      row.payment_method == null ? null : (text(row.payment_method) as PaymentMethod),
    notes: nullableText(row.notes),
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  };
}

function mapRoom(row: Row): Room {
  return {
    id: text(row.id),
    excursionId: text(row.excursion_id),
    label: text(row.label),
    roomType: text(row.room_type) as RoomType,
    capacity: number(row.capacity),
    notes: nullableText(row.notes),
    createdAt: timestamp(row.created_at),
  };
}

function mapAssignment(row: Row): RoomAssignment {
  return {
    id: text(row.id),
    roomId: text(row.room_id),
    passengerId: text(row.passenger_id),
    createdAt: timestamp(row.created_at),
  };
}

function text(value: unknown): string {
  return String(value);
}

function nullableText(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

function number(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function timestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toISOString();
}

function dateOnly(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}
