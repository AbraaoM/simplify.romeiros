export type ExcursionStatus =
  | "draft"
  | "open"
  | "closed"
  | "completed"
  | "cancelled";

export type PassengerStatus = "reserved" | "confirmed" | "cancelled";

export type SeatStatus = "available" | "occupied" | "blocked";

export type SeatSide = "left" | "right";

export type SeatPosition = "window" | "aisle";

export type InstallmentStatus = "pending" | "paid" | "waived" | "cancelled";

export type PaymentMethod =
  | "pix"
  | "cash"
  | "boleto"
  | "card"
  | "transfer"
  | "other";

export type DocumentType = "cpf" | "rg" | "passport" | "other";

export type RoomType = "single" | "double" | "triple" | "quadruple" | "other";

export type PaymentStanding = "overdue" | "due_today" | "pending" | "settled";

export type IssueCode =
  | "boarding_point_excursion"
  | "seat_passenger_excursion"
  | "occupied_cancelled_passenger"
  | "seat_count"
  | "seat_status_passenger"
  | "duplicate_passenger_seat"
  | "installment_excursion"
  | "room_excursion"
  | "room_capacity"
  | "cpf_digits";

export type Agency = {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Excursion = {
  id: string;
  agencyId: string;
  destination: string;
  originCity: string | null;
  departureAt: string;
  returnAt: string | null;
  vehicleCapacity: number;
  vehicleLabel: string | null;
  status: ExcursionStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BoardingPoint = {
  id: string;
  excursionId: string;
  name: string;
  address: string | null;
  departAt: string | null;
  sortOrder: number;
  notes: string | null;
  createdAt: string;
};

export type Passenger = {
  id: string;
  excursionId: string;
  boardingPointId: string | null;
  fullName: string;
  documentType: DocumentType;
  documentNumber: string | null;
  documentIssuer: string | null;
  phone: string | null;
  email: string | null;
  status: PassengerStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Seat = {
  id: string;
  excursionId: string;
  seatNumber: number;
  rowIndex: number;
  side: SeatSide;
  position: SeatPosition;
  status: SeatStatus;
  passengerId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Installment = {
  id: string;
  passengerId: string;
  excursionId: string;
  sequence: number;
  label: string | null;
  amountCents: number;
  dueDate: string;
  status: InstallmentStatus;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Room = {
  id: string;
  excursionId: string;
  label: string;
  roomType: RoomType;
  capacity: number;
  notes: string | null;
  createdAt: string;
};

export type RoomAssignment = {
  id: string;
  roomId: string;
  passengerId: string;
  createdAt: string;
};

export type AgencyData = {
  agency: Agency | null;
  excursions: Excursion[];
  boardingPoints: BoardingPoint[];
  passengers: Passenger[];
  seats: Seat[];
  installments: Installment[];
  rooms: Room[];
  roomAssignments: RoomAssignment[];
};
