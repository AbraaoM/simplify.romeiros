import { isActiveExcursion } from "@/lib/domain/active";
import { collectIssues } from "@/lib/domain/consistency";
import { calendarDateInBrazil } from "@/lib/domain/dates";
import { paymentStanding } from "@/lib/domain/payment-standing";
import { isCoach22 } from "@/lib/domain/seats";
import type {
  AgencyData,
  BoardingPoint,
  Excursion,
  ExcursionStatus,
  Installment,
  Passenger,
  PassengerStatus,
  PaymentStanding,
  RoomType,
  Seat,
} from "@/lib/domain/types";

export type DashboardHeadline =
  | { kind: "overdue"; count: number }
  | { kind: "due_today"; count: number }
  | { kind: "next_departure"; destination: string; departureAt: string }
  | { kind: "empty" };

export type TripSummary = {
  id: string;
  destination: string;
  departureAt: string;
  returnAt: string | null;
  status: ExcursionStatus;
  occupied: number;
  capacity: number;
  paid: number;
  open: number;
  overdue: number;
};

export type AttentionItem = {
  installmentId: string;
  passengerId: string;
  passengerName: string;
  excursionId: string;
  destination: string;
  seatNumber: number | null;
  amountCents: number;
  dueDate: string;
  standing: "overdue" | "due_today";
};

export type Dashboard = {
  agencyName: string | null;
  headline: DashboardHeadline;
  trips: TripSummary[];
  attention: AttentionItem[];
};

export type PassengerRow = {
  id: string;
  fullName: string;
  documentType: Passenger["documentType"];
  documentNumber: string | null;
  documentIssuer: string | null;
  seatNumber: number | null;
  boardingPointName: string | null;
  standing: PaymentStanding;
  nextAmountCents: number | null;
  nextDueDate: string | null;
  status: PassengerStatus;
};

export type SeatView = Seat & {
  standing: PaymentStanding | null;
  passengerName: string | null;
};

export type RoomView = {
  id: string;
  label: string;
  roomType: RoomType;
  capacity: number;
  passengerNames: string[];
};

export type PassengerFile = {
  excursionId: string;
  destination: string;
  passenger: Passenger;
  boardingPoints: BoardingPoint[];
  seatId: string | null;
  seatNumber: number | null;
  installments: Installment[];
  pendingInstallmentId: string | null;
};

export type SeatChoice = {
  id: string;
  fullName: string;
  seatNumber: number | null;
};

export type SeatPage = {
  excursionId: string;
  destination: string;
  seat: Seat;
  passengerName: string | null;
  choices: SeatChoice[];
};

export type ExcursionView = {
  id: string;
  destination: string;
  originCity: string | null;
  departureAt: string;
  returnAt: string | null;
  status: ExcursionStatus;
  vehicleLabel: string | null;
  vehicleCapacity: number;
  occupied: number;
  paid: number;
  open: number;
  overdue: number;
  mapMode: "coach_2_2" | "list";
  mapIncomplete: boolean;
  seats: SeatView[];
  passengers: PassengerRow[];
  rooms: RoomView[];
  boardingPoints: Array<{ id: string; name: string }>;
};

const SEAT_ISSUE = new Set([
  "seat_count",
  "seat_status_passenger",
  "duplicate_passenger_seat",
  "occupied_cancelled_passenger",
  "seat_passenger_excursion",
]);

export function projectDueAttention(
  data: AgencyData,
  today: string,
): AttentionItem[] {
  const excursions = new Map(
    data.excursions
      .filter((excursion) => isActiveExcursion(excursion.status))
      .map((excursion) => [excursion.id, excursion]),
  );
  const items: AttentionItem[] = [];

  for (const installment of data.installments) {
    if (installment.status !== "pending" || installment.dueDate > today) continue;
    const excursion = excursions.get(installment.excursionId);
    if (!excursion) continue;
    const passenger = data.passengers.find(
      (item) => item.id === installment.passengerId,
    );
    if (!passenger || passenger.status === "cancelled") continue;
    if (passenger.excursionId !== installment.excursionId) continue;

    items.push({
      installmentId: installment.id,
      passengerId: passenger.id,
      passengerName: passenger.fullName,
      excursionId: excursion.id,
      destination: excursion.destination,
      seatNumber: seatNumberFor(data.seats, passenger.id),
      amountCents: installment.amountCents,
      dueDate: installment.dueDate,
      standing: installment.dueDate < today ? "overdue" : "due_today",
    });
  }

  items.sort((a, b) => {
    if (a.standing !== b.standing) return a.standing === "overdue" ? -1 : 1;
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    return a.passengerName.localeCompare(b.passengerName, "pt-BR");
  });

  return items;
}

export function projectDashboard(data: AgencyData, today: string): Dashboard {
  const attention = projectDueAttention(data, today);
  const overdue = attention.filter((item) => item.standing === "overdue").length;
  const dueToday = attention.filter((item) => item.standing === "due_today").length;
  const trips = activeTrips(data, today);

  return {
    agencyName: data.agency?.name ?? null,
    headline: headlineFor(overdue, dueToday, trips, today),
    trips,
    attention: attention.slice(0, 5),
  };
}

export function projectExcursion(
  data: AgencyData,
  excursionId: string,
  today: string,
): ExcursionView | null {
  const excursion = data.excursions.find((item) => item.id === excursionId);
  if (!excursion) return null;

  const passengers = data.passengers.filter(
    (passenger) => passenger.excursionId === excursionId,
  );
  const activeIds = new Set(
    passengers
      .filter((passenger) => passenger.status !== "cancelled")
      .map((passenger) => passenger.id),
  );
  const installments = data.installments.filter(
    (installment) =>
      installment.excursionId === excursionId &&
      activeIds.has(installment.passengerId),
  );
  const counts = installmentCounts(installments, today);
  const seats = data.seats
    .filter((seat) => seat.excursionId === excursionId)
    .sort((a, b) => a.seatNumber - b.seatNumber);
  const issues = collectIssues(data, excursionId);

  return {
    id: excursion.id,
    destination: excursion.destination,
    originCity: excursion.originCity,
    departureAt: excursion.departureAt,
    returnAt: excursion.returnAt,
    status: excursion.status,
    vehicleLabel: excursion.vehicleLabel,
    vehicleCapacity: excursion.vehicleCapacity,
    occupied: seats.filter((seat) => seat.status === "occupied").length,
    ...counts,
    mapMode: isCoach22(seats) ? "coach_2_2" : "list",
    mapIncomplete: issues.some((issue) => SEAT_ISSUE.has(issue)),
    seats: seats.map((seat) => toSeatView(data, seat, today)),
    passengers: passengers
      .map((passenger) => toPassengerRow(data, passenger, today))
      .sort(comparePassengers),
    boardingPoints: data.boardingPoints
      .filter((point) => point.excursionId === excursionId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pt-BR"))
      .map((point) => ({ id: point.id, name: point.name })),
    rooms: roomViews(data, excursionId),
  };
}

export function projectPassengerFile(
  data: AgencyData,
  excursionId: string,
  passengerId: string,
): PassengerFile | null {
  const excursion = data.excursions.find((item) => item.id === excursionId);
  const passenger = data.passengers.find(
    (item) => item.id === passengerId && item.excursionId === excursionId,
  );
  if (!excursion || !passenger) return null;

  const installments = data.installments
    .filter((item) => item.passengerId === passengerId)
    .sort((a, b) => a.sequence - b.sequence);
  const pending = installments
    .filter((item) => item.status === "pending")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const seat = data.seats.find((item) => item.passengerId === passengerId);

  return {
    excursionId,
    destination: excursion.destination,
    passenger,
    boardingPoints: data.boardingPoints
      .filter((point) => point.excursionId === excursionId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pt-BR")),
    seatId: seat?.id ?? null,
    seatNumber: seat?.seatNumber ?? null,
    installments,
    pendingInstallmentId: pending && pending.dueDate ? pending.id : null,
  };
}

export function projectSeatPage(
  data: AgencyData,
  excursionId: string,
  seatId: string,
): SeatPage | null {
  const excursion = data.excursions.find((item) => item.id === excursionId);
  const seat = data.seats.find(
    (item) => item.id === seatId && item.excursionId === excursionId,
  );
  if (!excursion || !seat) return null;

  const occupant = seat.passengerId
    ? data.passengers.find((item) => item.id === seat.passengerId)
    : undefined;
  const choices = data.passengers
    .filter(
      (passenger) =>
        passenger.excursionId === excursionId &&
        passenger.status !== "cancelled" &&
        passenger.id !== seat.passengerId,
    )
    .map((passenger) => ({
      id: passenger.id,
      fullName: passenger.fullName,
      seatNumber: seatNumberFor(data.seats, passenger.id),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));

  return {
    excursionId,
    destination: excursion.destination,
    seat,
    passengerName: occupant?.fullName ?? null,
    choices,
  };
}

function headlineFor(
  overdue: number,
  dueToday: number,
  trips: TripSummary[],
  today: string,
): DashboardHeadline {
  if (overdue > 0) return { kind: "overdue", count: overdue };
  if (dueToday > 0) return { kind: "due_today", count: dueToday };
  const upcoming = trips.find(
    (trip) => calendarDateInBrazil(trip.departureAt) >= today,
  );
  const next = upcoming ?? trips[0];
  if (!next) return { kind: "empty" };
  return {
    kind: "next_departure",
    destination: next.destination,
    departureAt: next.departureAt,
  };
}

function activeTrips(data: AgencyData, today: string): TripSummary[] {
  return data.excursions
    .filter((excursion) => isActiveExcursion(excursion.status))
    .sort((a, b) => a.departureAt.localeCompare(b.departureAt))
    .map((excursion) => toTripSummary(data, excursion, today));
}

function toTripSummary(
  data: AgencyData,
  excursion: Excursion,
  today: string,
): TripSummary {
  const activeIds = new Set(
    data.passengers
      .filter(
        (passenger) =>
          passenger.excursionId === excursion.id &&
          passenger.status !== "cancelled",
      )
      .map((passenger) => passenger.id),
  );
  const installments = data.installments.filter(
    (installment) =>
      installment.excursionId === excursion.id &&
      activeIds.has(installment.passengerId),
  );
  const counts = installmentCounts(installments, today);
  const occupied = data.seats.filter(
    (seat) => seat.excursionId === excursion.id && seat.status === "occupied",
  ).length;

  return {
    id: excursion.id,
    destination: excursion.destination,
    departureAt: excursion.departureAt,
    returnAt: excursion.returnAt,
    status: excursion.status,
    occupied,
    capacity: excursion.vehicleCapacity,
    ...counts,
  };
}

function installmentCounts(installments: Installment[], today: string) {
  const pending = installments.filter((item) => item.status === "pending");
  return {
    paid: installments.filter((item) => item.status === "paid").length,
    open: pending.length,
    overdue: pending.filter((item) => item.dueDate < today).length,
  };
}

function toSeatView(data: AgencyData, seat: Seat, today: string): SeatView {
  const passenger = seat.passengerId
    ? data.passengers.find((item) => item.id === seat.passengerId)
    : undefined;
  if (!passenger) {
    return { ...seat, standing: null, passengerName: null };
  }
  const installments = data.installments.filter(
    (item) => item.passengerId === passenger.id,
  );
  return {
    ...seat,
    standing: paymentStanding(installments, today),
    passengerName: passenger.fullName,
  };
}

function toPassengerRow(
  data: AgencyData,
  passenger: Passenger,
  today: string,
): PassengerRow {
  const installments = data.installments.filter(
    (item) => item.passengerId === passenger.id,
  );
  const next = installments
    .filter((item) => item.status === "pending")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const point = data.boardingPoints.find(
    (item) => item.id === passenger.boardingPointId,
  );

  return {
    id: passenger.id,
    fullName: passenger.fullName,
    documentType: passenger.documentType,
    documentNumber: passenger.documentNumber,
    documentIssuer: passenger.documentIssuer,
    seatNumber: seatNumberFor(data.seats, passenger.id),
    boardingPointName: point?.name ?? null,
    standing: paymentStanding(installments, today),
    nextAmountCents: next?.amountCents ?? null,
    nextDueDate: next?.dueDate ?? null,
    status: passenger.status,
  };
}

function roomViews(data: AgencyData, excursionId: string): RoomView[] {
  return data.rooms
    .filter((room) => room.excursionId === excursionId)
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
    .map((room) => ({
      id: room.id,
      label: room.label,
      roomType: room.roomType,
      capacity: room.capacity,
      passengerNames: data.roomAssignments
        .filter((assignment) => assignment.roomId === room.id)
        .map(
          (assignment) =>
            data.passengers.find((item) => item.id === assignment.passengerId)
              ?.fullName,
        )
        .filter((name): name is string => Boolean(name))
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    }));
}

function comparePassengers(a: PassengerRow, b: PassengerRow): number {
  const rank = (status: PassengerStatus) => (status === "cancelled" ? 1 : 0);
  const byStatus = rank(a.status) - rank(b.status);
  if (byStatus !== 0) return byStatus;
  if (a.seatNumber === null && b.seatNumber !== null) return 1;
  if (a.seatNumber !== null && b.seatNumber === null) return -1;
  if (a.seatNumber !== null && b.seatNumber !== null && a.seatNumber !== b.seatNumber) {
    return a.seatNumber - b.seatNumber;
  }
  return a.fullName.localeCompare(b.fullName, "pt-BR");
}

function seatNumberFor(seats: Seat[], passengerId: string): number | null {
  const matches = seats
    .filter((seat) => seat.passengerId === passengerId)
    .sort((a, b) => a.seatNumber - b.seatNumber);
  return matches[0]?.seatNumber ?? null;
}
