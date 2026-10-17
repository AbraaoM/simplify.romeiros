import { addDays, nextSaturdayOnOrAfter } from "@/lib/domain/dates";
import type {
  AgencyData,
  BoardingPoint,
  Excursion,
  Installment,
  Passenger,
  PassengerStatus,
  Room,
  RoomAssignment,
  Seat,
} from "@/lib/domain/types";

const STAMP = "2026-01-01T12:00:00.000Z";

function uid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
}

function buildCoach(excursionId: string, capacity: number, idBase: number): Seat[] {
  const slots: Array<[Seat["side"], Seat["position"]]> = [
    ["left", "window"],
    ["left", "aisle"],
    ["right", "aisle"],
    ["right", "window"],
  ];
  const seats: Seat[] = [];
  let number = 0;
  for (let row = 1; row <= capacity / 4; row += 1) {
    for (const [side, position] of slots) {
      number += 1;
      seats.push({
        id: uid(idBase + number),
        excursionId,
        seatNumber: number,
        rowIndex: row,
        side,
        position,
        status: "available",
        passengerId: null,
        notes: null,
        createdAt: STAMP,
        updatedAt: STAMP,
      });
    }
  }
  return seats;
}

function occupy(seats: Seat[], seatNumber: number, passengerId: string) {
  const seat = seats.find((item) => item.seatNumber === seatNumber);
  if (!seat) throw new Error(`Poltrona ${seatNumber} não existe no fixture.`);
  seat.status = "occupied";
  seat.passengerId = passengerId;
}

function block(seats: Seat[], seatNumber: number, notes: string) {
  const seat = seats.find((item) => item.seatNumber === seatNumber);
  if (!seat) throw new Error(`Poltrona ${seatNumber} não existe no fixture.`);
  seat.status = "blocked";
  seat.notes = notes;
}

type Person = {
  id: number;
  name: string;
  document: string;
  pointId: string | null;
  status?: PassengerStatus;
  seat: number | null;
};

function people(
  excursionId: string,
  specs: Person[],
): Passenger[] {
  return specs.map((spec) => ({
    id: uid(spec.id),
    excursionId,
    boardingPointId: spec.pointId,
    fullName: spec.name,
    documentType: "cpf",
    documentNumber: spec.document,
    documentIssuer: "SSP/SP",
    phone: null,
    email: null,
    status: spec.status ?? "confirmed",
    notes: null,
    createdAt: STAMP,
    updatedAt: STAMP,
  }));
}

function paid(
  id: number,
  passengerId: string,
  excursionId: string,
  sequence: number,
  amountCents: number,
  dueDate: string,
): Installment {
  return {
    id: uid(id),
    passengerId,
    excursionId,
    sequence,
    label: sequence === 1 ? "Entrada" : `${sequence}ª parcela`,
    amountCents,
    dueDate,
    status: "paid",
    paidAt: `${dueDate}T15:00:00.000Z`,
    paymentMethod: "pix",
    notes: null,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

function pending(
  id: number,
  passengerId: string,
  excursionId: string,
  sequence: number,
  amountCents: number,
  dueDate: string,
): Installment {
  return {
    id: uid(id),
    passengerId,
    excursionId,
    sequence,
    label: sequence === 1 ? "Entrada" : `${sequence}ª parcela`,
    amountCents,
    dueDate,
    status: "pending",
    paidAt: null,
    paymentMethod: null,
    notes: null,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

function excursion(input: {
  id: number;
  agencyId: string;
  destination: string;
  departureAt: string;
  returnAt: string;
  capacity: number;
  status: Excursion["status"];
  vehicleLabel: string;
}): Excursion {
  return {
    id: uid(input.id),
    agencyId: input.agencyId,
    destination: input.destination,
    originCity: "Taubaté",
    departureAt: input.departureAt,
    returnAt: input.returnAt,
    vehicleCapacity: input.capacity,
    vehicleLabel: input.vehicleLabel,
    status: input.status,
    notes: null,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

function point(
  id: number,
  excursionId: string,
  name: string,
  sortOrder: number,
): BoardingPoint {
  return {
    id: uid(id),
    excursionId,
    name,
    address: null,
    departAt: null,
    sortOrder,
    notes: null,
    createdAt: STAMP,
  };
}

export function buildExample(today: string): AgencyData {
  const agencyId = uid(1);
  const saturday = nextSaturdayOnOrAfter(today);
  const aparecidaId = uid(10);
  const camposId = uid(11);
  const cancaoId = uid(12);
  const taubate = uid(21);
  const pinda = uid(22);
  const guara = uid(23);
  const camposPoint = uid(24);
  const room101 = uid(41);
  const room102 = uid(42);

  const aparecidaSeats = buildCoach(aparecidaId, 44, 1000);
  const camposSeats = buildCoach(camposId, 44, 2000);
  const cancaoSeats = buildCoach(cancaoId, 16, 3000);
  block(aparecidaSeats, 44, "Reservada para a tripulação");

  const aparecidaPeople = people(aparecidaId, [
    { id: 101, name: "Maria Souza", document: "90000000001", pointId: taubate, seat: 1 },
    { id: 102, name: "João Ribeiro", document: "90000000002", pointId: taubate, seat: 2 },
    { id: 103, name: "Camila Rocha", document: "90000000003", pointId: guara, seat: 6 },
    { id: 104, name: "Ana Lima", document: "90000000004", pointId: pinda, seat: 5 },
    { id: 105, name: "Pedro Alves", document: "90000000005", pointId: guara, seat: 9 },
    { id: 106, name: "Lucia Ferreira", document: "90000000006", pointId: taubate, seat: 10 },
    { id: 107, name: "Carlos Mendes", document: "90000000007", pointId: taubate, seat: 13 },
    { id: 108, name: "Bruno Teixeira", document: "90000000008", pointId: pinda, seat: 14 },
    { id: 109, name: "Rita Gomes", document: "90000000009", pointId: pinda, seat: 17 },
    { id: 110, name: "Paulo Nunes", document: "90000000010", pointId: guara, seat: 18 },
    { id: 111, name: "Diego Martins", document: "90000000011", pointId: taubate, seat: 21 },
    { id: 112, name: "Helena Dias", document: "90000000012", pointId: taubate, seat: 22 },
    { id: 113, name: "Sandra Vieira", document: "90000000013", pointId: pinda, seat: null },
    {
      id: 114,
      name: "Fernanda Costa",
      document: "90000000014",
      pointId: taubate,
      seat: null,
      status: "cancelled",
    },
  ]);

  for (const spec of [
    [101, 1],
    [102, 2],
    [103, 6],
    [104, 5],
    [105, 9],
    [106, 10],
    [107, 13],
    [108, 14],
    [109, 17],
    [110, 18],
    [111, 21],
    [112, 22],
  ] as const) {
    occupy(aparecidaSeats, spec[1], uid(spec[0]));
  }

  const camposPeople = people(camposId, [
    { id: 201, name: "Elisa Prado", document: "90000000021", pointId: camposPoint, seat: 1 },
    { id: 202, name: "Marcos Vieira", document: "90000000022", pointId: camposPoint, seat: 2 },
    { id: 203, name: "Nina Costa", document: "90000000023", pointId: camposPoint, seat: 3 },
    { id: 204, name: "Otávio Lima", document: "90000000024", pointId: camposPoint, seat: 4 },
  ]);
  for (const id of [201, 202, 203, 204]) {
    occupy(camposSeats, id - 200, uid(id));
  }

  const cancaoPeople = people(cancaoId, [
    { id: 301, name: "Irmã Benedita", document: "90000000031", pointId: null, seat: 1 },
  ]);
  occupy(cancaoSeats, 1, uid(301));

  const rooms: Room[] = [
    {
      id: room101,
      excursionId: aparecidaId,
      label: "101",
      roomType: "double",
      capacity: 2,
      notes: null,
      createdAt: STAMP,
    },
    {
      id: room102,
      excursionId: aparecidaId,
      label: "102",
      roomType: "double",
      capacity: 2,
      notes: null,
      createdAt: STAMP,
    },
  ];

  const roomAssignments: RoomAssignment[] = [
    { id: 501, roomId: room101, passengerId: 101 },
    { id: 502, roomId: room101, passengerId: 102 },
    { id: 503, roomId: room102, passengerId: 104 },
    { id: 504, roomId: room102, passengerId: 106 },
  ].map((assignment) => ({
    id: uid(assignment.id),
    roomId: assignment.roomId,
    passengerId: uid(assignment.passengerId),
    createdAt: STAMP,
  }));

  const past = addDays(today, -20);
  const installments: Installment[] = [
    paid(401, uid(101), aparecidaId, 1, 15000, past),
    pending(402, uid(101), aparecidaId, 2, 15000, addDays(today, -5)),
    pending(403, uid(102), aparecidaId, 1, 20000, addDays(today, -2)),
    pending(404, uid(103), aparecidaId, 1, 18000, addDays(today, -1)),
    pending(405, uid(104), aparecidaId, 1, 15000, today),
    pending(406, uid(105), aparecidaId, 1, 15000, today),
    pending(407, uid(106), aparecidaId, 1, 30000, addDays(today, 15)),
    pending(408, uid(107), aparecidaId, 1, 30000, addDays(today, 15)),
    pending(409, uid(108), aparecidaId, 1, 25000, addDays(today, 20)),
    paid(410, uid(109), aparecidaId, 1, 15000, past),
    paid(411, uid(109), aparecidaId, 2, 15000, past),
    paid(412, uid(110), aparecidaId, 1, 20000, past),
    paid(413, uid(111), aparecidaId, 1, 20000, past),
    {
      id: uid(414),
      passengerId: uid(112),
      excursionId: aparecidaId,
      sequence: 1,
      label: "Cortesia",
      amountCents: 0,
      dueDate: addDays(today, -1),
      status: "waived",
      paidAt: null,
      paymentMethod: null,
      notes: null,
      createdAt: STAMP,
      updatedAt: STAMP,
    },
    pending(415, uid(113), aparecidaId, 1, 10000, today),
    pending(416, uid(114), aparecidaId, 1, 15000, addDays(today, -3)),
    pending(421, uid(201), camposId, 1, 25000, addDays(today, 30)),
    pending(422, uid(202), camposId, 1, 25000, addDays(today, 30)),
    pending(423, uid(203), camposId, 1, 25000, addDays(today, 30)),
    pending(424, uid(204), camposId, 1, 25000, addDays(today, 30)),
    paid(431, uid(301), cancaoId, 1, 12000, addDays(today, -40)),
  ];

  return {
    agency: {
      id: agencyId,
      name: "Vale Romarias",
      phone: "12999990000",
      city: "Taubaté",
      notes: null,
      createdAt: STAMP,
      updatedAt: STAMP,
    },
    excursions: [
      excursion({
        id: 10,
        agencyId,
        destination: "Aparecida",
        departureAt: `${saturday}T07:00:00-03:00`,
        returnAt: `${addDays(saturday, 1)}T20:00:00-03:00`,
        capacity: 44,
        status: "open",
        vehicleLabel: "Ônibus 44 lugares",
      }),
      excursion({
        id: 11,
        agencyId,
        destination: "Campos do Jordão",
        departureAt: `${addDays(saturday, 21)}T08:00:00-03:00`,
        returnAt: `${addDays(saturday, 22)}T19:00:00-03:00`,
        capacity: 44,
        status: "open",
        vehicleLabel: "Ônibus 44 lugares",
      }),
      excursion({
        id: 12,
        agencyId,
        destination: "Canção Nova",
        departureAt: `${addDays(today, -30)}T08:00:00-03:00`,
        returnAt: `${addDays(today, -30)}T21:00:00-03:00`,
        capacity: 16,
        status: "completed",
        vehicleLabel: "Micro-ônibus 16 lugares",
      }),
    ],
    boardingPoints: [
      point(21, aparecidaId, "Terminal — Taubaté", 0),
      point(22, aparecidaId, "Pindamonhangaba", 1),
      point(23, aparecidaId, "Guaratinguetá", 2),
      point(24, camposId, "Taubaté", 0),
    ],
    passengers: [...aparecidaPeople, ...camposPeople, ...cancaoPeople],
    seats: [...aparecidaSeats, ...camposSeats, ...cancaoSeats],
    installments,
    rooms,
    roomAssignments,
  };
}
