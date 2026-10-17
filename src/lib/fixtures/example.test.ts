import { expect, test } from "vitest";
import { collectIssues } from "@/lib/domain/consistency";
import {
  calendarDateInBrazil,
  nextSaturdayOnOrAfter,
} from "@/lib/domain/dates";
import { buildExample } from "./example";
import {
  projectDashboard,
  projectDueAttention,
  projectExcursion,
} from "@/lib/services/views";

const today = "2026-10-16";

test("builds a coherent example and keeps the finished trip off the dashboard", () => {
  const data = buildExample(today);
  for (const excursion of data.excursions) {
    expect(collectIssues(data, excursion.id)).toEqual([]);
  }

  const dashboard = projectDashboard(data, today);
  expect(dashboard.agencyName).toBe("Vale Romarias");
  expect(dashboard.headline).toEqual({ kind: "overdue", count: 3 });
  expect(dashboard.trips.map((trip) => trip.destination)).toEqual([
    "Aparecida",
    "Campos do Jordão",
  ]);

  const aparecida = dashboard.trips[0];
  expect(aparecida.occupied).toBe(12);
  expect(aparecida.capacity).toBe(44);
  expect(aparecida.paid).toBe(5);
  expect(aparecida.open).toBe(9);
  expect(aparecida.overdue).toBe(3);
  expect(calendarDateInBrazil(aparecida.departureAt)).toBe(
    nextSaturdayOnOrAfter(today),
  );

  expect(dashboard.attention.map((item) => item.passengerName)).toEqual([
    "Maria Souza",
    "João Ribeiro",
    "Camila Rocha",
    "Ana Lima",
    "Pedro Alves",
  ]);
  expect(projectDueAttention(data, today).map((item) => item.passengerName)).toEqual([
    "Maria Souza",
    "João Ribeiro",
    "Camila Rocha",
    "Ana Lima",
    "Pedro Alves",
    "Sandra Vieira",
  ]);
  expect(
    projectDueAttention(data, today).some(
      (item) => item.passengerName === "Fernanda Costa",
    ),
  ).toBe(false);

  const view = projectExcursion(data, data.excursions[0].id, today);
  expect(view?.mapMode).toBe("coach_2_2");
  expect(view?.mapIncomplete).toBe(false);
  expect(view?.rooms.map((room) => ({
    label: room.label,
    names: room.passengerNames,
  }))).toEqual([
    { label: "101", names: ["João Ribeiro", "Maria Souza"] },
    { label: "102", names: ["Ana Lima", "Lucia Ferreira"] },
  ]);

  const maria = view?.passengers.find((person) => person.fullName === "Maria Souza");
  expect(maria).toMatchObject({
    seatNumber: 1,
    standing: "overdue",
    nextAmountCents: 15000,
    boardingPointName: "Terminal — Taubaté",
  });

  const helena = view?.passengers.find((person) => person.fullName === "Helena Dias");
  expect(helena?.standing).toBe("settled");
  expect(helena?.nextAmountCents).toBeNull();

  const campos = projectExcursion(data, data.excursions[1].id, today);
  expect(campos?.rooms).toEqual([]);
  expect(campos?.overdue).toBe(0);
});
