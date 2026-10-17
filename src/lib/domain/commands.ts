import type {
  DocumentType,
  InstallmentStatus,
  PassengerStatus,
  SeatPosition,
  SeatSide,
  SeatStatus,
} from "./types";

export type CommandResult<T> =
  | ({ ok: true } & T)
  | { ok: false; message: string };

export type CoachSeat = {
  seatNumber: number;
  rowIndex: number;
  side: SeatSide;
  position: SeatPosition;
};

const SLOTS: Array<[SeatSide, SeatPosition]> = [
  ["left", "window"],
  ["left", "aisle"],
  ["right", "aisle"],
  ["right", "window"],
];

const CAPACITY_MESSAGE =
  "A capacidade precisa ser um múltiplo de 4, entre 4 e 80.";

export function buildCoachLayout(
  capacity: number,
): CommandResult<{ seats: CoachSeat[] }> {
  if (!Number.isInteger(capacity) || capacity < 4 || capacity > 80 || capacity % 4 !== 0) {
    return { ok: false, message: CAPACITY_MESSAGE };
  }

  const seats: CoachSeat[] = [];
  let seatNumber = 0;
  for (let rowIndex = 1; rowIndex <= capacity / 4; rowIndex += 1) {
    for (const [side, position] of SLOTS) {
      seatNumber += 1;
      seats.push({ seatNumber, rowIndex, side, position });
    }
  }
  return { ok: true, seats };
}

export function excursionSchedule(
  departureDate: string,
  returnDate: string | null,
): CommandResult<{ departureAt: string; returnAt: string | null }> {
  const departure = calendarDay(departureDate);
  if (!departure) return { ok: false, message: "Informe o dia da ida." };

  const trimmedReturn = returnDate?.trim() ?? "";
  if (!trimmedReturn) {
    return {
      ok: true,
      departureAt: `${departure}T08:00:00-03:00`,
      returnAt: null,
    };
  }

  const returning = calendarDay(trimmedReturn);
  if (!returning) return { ok: false, message: "Informe um dia de volta válido." };
  if (returning < departure) {
    return { ok: false, message: "A volta não pode ser antes da ida." };
  }

  return {
    ok: true,
    departureAt: `${departure}T08:00:00-03:00`,
    returnAt: `${returning}T18:00:00-03:00`,
  };
}

export function parseMoney(input: string): CommandResult<{ cents: number }> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: "Informe o valor." };

  let reais: string;
  let decimals = "00";
  if (trimmed.includes(",")) {
    const [whole, fraction = "", extra] = trimmed.split(",");
    if (extra !== undefined || !/^\d{1,3}(\.\d{3})*$|^\d+$/.test(whole) || !/^\d{1,2}$/.test(fraction)) {
      return { ok: false, message: "Informe o valor em reais, como 150,00." };
    }
    reais = whole.replaceAll(".", "");
    decimals = fraction.padEnd(2, "0");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(trimmed) || /^\d+$/.test(trimmed)) {
    reais = trimmed.replaceAll(".", "");
  } else {
    return { ok: false, message: "Informe o valor em reais, como 150,00." };
  }

  const cents = Number(reais) * 100 + Number(decimals);
  if (!Number.isSafeInteger(cents)) {
    return { ok: false, message: "Informe o valor em reais, como 150,00." };
  }
  return { ok: true, cents };
}

export function normalizeDocument(
  type: DocumentType,
  raw: string,
): CommandResult<{ number: string | null }> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, number: null };
  if (type === "cpf") {
    const digits = trimmed.replace(/\D/g, "");
    if (!/^\d{11}$/.test(digits)) {
      return { ok: false, message: "O CPF precisa ter 11 dígitos." };
    }
    return { ok: true, number: digits };
  }
  return { ok: true, number: trimmed };
}

export function parseBoardingNames(text: string): string[] {
  const names: string[] = [];
  for (const line of text.split("\n")) {
    const name = line.trim();
    if (!name || names.includes(name)) continue;
    names.push(name);
  }
  return names;
}

export function requireName(input: string): CommandResult<{ name: string }> {
  const name = input.trim();
  if (!name) return { ok: false, message: "Informe o nome." };
  return { ok: true, name };
}

export type SeatSnapshot = {
  id: string;
  status: SeatStatus;
  passengerId: string | null;
  excursionId: string;
};

export type PassengerSnapshot = {
  id: string;
  excursionId: string;
  status: PassengerStatus;
};

export type SeatWrite = {
  seatId: string;
  status: "available" | "occupied";
  passengerId: string | null;
};

export function planSeatChange(
  seats: SeatSnapshot[],
  passengers: PassengerSnapshot[],
  command:
    | { type: "assign"; seatId: string; passengerId: string }
    | { type: "release"; seatId: string },
): CommandResult<{ writes: SeatWrite[] }> {
  const target = seats.find((item) => item.id === command.seatId);
  if (!target) {
    return { ok: false, message: "Essa poltrona não está nesta excursão." };
  }

  if (command.type === "release") {
    if (target.status !== "occupied" || !target.passengerId) {
      return { ok: false, message: "Essa poltrona já está livre." };
    }
    return {
      ok: true,
      writes: [{ seatId: target.id, status: "available", passengerId: null }],
    };
  }

  const passenger = passengers.find((item) => item.id === command.passengerId);
  if (!passenger || passenger.excursionId !== target.excursionId) {
    return { ok: false, message: "Esse passageiro não está nesta excursão." };
  }
  if (passenger.status === "cancelled") {
    return { ok: false, message: "Passageiro cancelado não ocupa poltrona." };
  }
  if (target.status === "blocked") {
    return { ok: false, message: "Essa poltrona está bloqueada." };
  }
  if (target.passengerId === passenger.id) {
    return { ok: false, message: "Essa pessoa já está nesta poltrona." };
  }
  if (target.passengerId) {
    return { ok: false, message: "Essa poltrona acabou de ser ocupada." };
  }

  const current = seats.find(
    (item) => item.id !== target.id && item.passengerId === passenger.id,
  );
  const writes: SeatWrite[] = [];
  if (current) {
    writes.push({ seatId: current.id, status: "available", passengerId: null });
  }
  writes.push({ seatId: target.id, status: "occupied", passengerId: passenger.id });
  return { ok: true, writes };
}

export function planCancelPassenger(
  passenger: PassengerSnapshot | null,
  seats: SeatSnapshot[],
): CommandResult<{ seatIdToRelease: string | null }> {
  if (!passenger) {
    return { ok: false, message: "Esse passageiro não está nesta excursão." };
  }
  if (passenger.status === "cancelled") {
    return { ok: false, message: "Esse passageiro já está cancelado." };
  }
  const seat = seats.find((item) => item.passengerId === passenger.id);
  return { ok: true, seatIdToRelease: seat?.id ?? null };
}

export function planMarkPaid(
  status: InstallmentStatus | null,
): CommandResult<Record<string, never>> {
  if (!status) return { ok: false, message: "Essa parcela não foi encontrada." };
  if (status !== "pending") {
    return {
      ok: false,
      message: "Só uma parcela pendente pode ser marcada como paga.",
    };
  }
  return { ok: true };
}

export function planNewInstallment(
  amount: string,
  dueDate: string,
  sequences: number[],
): CommandResult<{ amountCents: number; dueDate: string; sequence: number }> {
  const money = parseMoney(amount);
  if (!money.ok) return money;
  const day = calendarDay(dueDate);
  if (!day) return { ok: false, message: "Informe o vencimento." };
  const sequence = sequences.length === 0 ? 1 : Math.max(...sequences) + 1;
  return { ok: true, amountCents: money.cents, dueDate: day, sequence };
}

function calendarDay(input: string): string | null {
  const trimmed = input.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return trimmed;
}
