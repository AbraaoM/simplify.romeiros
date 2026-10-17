import type { AgencyData, IssueCode } from "./types";

export function collectIssues(data: AgencyData, excursionId: string): IssueCode[] {
  const excursion = data.excursions.find((item) => item.id === excursionId);
  if (!excursion) return [];

  const issues: IssueCode[] = [];
  const pointIds = new Set(
    data.boardingPoints
      .filter((point) => point.excursionId === excursionId)
      .map((point) => point.id),
  );
  const passengers = data.passengers.filter(
    (passenger) => passenger.excursionId === excursionId,
  );
  const seats = data.seats.filter((seat) => seat.excursionId === excursionId);

  if (seats.length !== excursion.vehicleCapacity) issues.push("seat_count");

  const seenPassengers = new Set<string>();
  for (const seat of seats) {
    const occupiedWithoutPassenger =
      seat.status === "occupied" && !seat.passengerId;
    const emptyWithPassenger =
      (seat.status === "available" || seat.status === "blocked") &&
      seat.passengerId !== null;
    if (occupiedWithoutPassenger || emptyWithPassenger) {
      issues.push("seat_status_passenger");
    }

    if (!seat.passengerId) continue;
    if (seenPassengers.has(seat.passengerId)) {
      issues.push("duplicate_passenger_seat");
    }
    seenPassengers.add(seat.passengerId);

    const passenger = data.passengers.find(
      (item) => item.id === seat.passengerId,
    );
    if (!passenger || passenger.excursionId !== excursionId) {
      issues.push("seat_passenger_excursion");
      continue;
    }
    if (seat.status === "occupied" && passenger.status === "cancelled") {
      issues.push("occupied_cancelled_passenger");
    }
  }

  for (const passenger of passengers) {
    if (passenger.boardingPointId && !pointIds.has(passenger.boardingPointId)) {
      issues.push("boarding_point_excursion");
    }
    if (
      passenger.documentType === "cpf" &&
      passenger.documentNumber !== null &&
      !/^\d{11}$/.test(passenger.documentNumber)
    ) {
      issues.push("cpf_digits");
    }
  }

  for (const installment of data.installments) {
    const passenger = data.passengers.find(
      (item) => item.id === installment.passengerId,
    );
    if (!passenger) continue;
    const touchesExcursion =
      passenger.excursionId === excursionId ||
      installment.excursionId === excursionId;
    if (!touchesExcursion) continue;
    if (passenger.excursionId !== installment.excursionId) {
      issues.push("installment_excursion");
    }
  }

  for (const room of data.rooms) {
    if (room.excursionId !== excursionId) continue;
    const assignments = data.roomAssignments.filter(
      (assignment) => assignment.roomId === room.id,
    );
    if (assignments.length > room.capacity) issues.push("room_capacity");
    for (const assignment of assignments) {
      const passenger = data.passengers.find(
        (item) => item.id === assignment.passengerId,
      );
      if (!passenger || passenger.excursionId !== room.excursionId) {
        issues.push("room_excursion");
      }
    }
  }

  return [...new Set(issues)];
}
