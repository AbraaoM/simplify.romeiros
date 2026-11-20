import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const recorder = vi.hoisted(() => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const flags = { empty: false };

  function tagged(strings: TemplateStringsArray, ...values: unknown[]) {
    const sql = strings.join("?");
    calls.push({ sql, values });
    if (flags.empty) return Promise.resolve([]);
    return Promise.resolve([{ id: "ok" }]);
  }

  tagged.transaction = async (statements: unknown[]) => {
    return Promise.all(statements as Array<Promise<unknown>>);
  };

  tagged.query = async (sql: string) => {
    calls.push({ sql, values: [] });
    return { rows: [] };
  };

  return {
    calls,
    flags,
    tagged,
    reset: () => {
      calls.length = 0;
      flags.empty = false;
    },
  };
});

vi.mock("@/lib/db/client", () => ({
  getSql: () => recorder.tagged,
}));

import { createTestTenantContext } from "@/lib/security/context";
import { RecordNotFound } from "@/lib/security/errors";
import {
  insertBoardingPoint,
  insertExcursion,
  markInstallmentPaid,
  saveAgencyRecord,
  updateExcursionRecord,
  updatePassengerRecord,
} from "./commands";

const contextA = createTestTenantContext({
  subjectId: "user-A",
  sessionId: "sess-A",
  agencyId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
});

beforeEach(() => {
  recorder.reset();
});

describe("escritas SQL carregam agency_id do contexto", () => {
  test("saveAgencyRecord atualiza só a agência do contexto e devolve RETURNING", async () => {
    await saveAgencyRecord(contextA, { name: "Agência A", phone: null, city: null });
    expect(recorder.calls).toHaveLength(1);
    expect(recorder.calls[0]?.sql).toMatch(/where id = \?/);
    expect(recorder.calls[0]?.sql).toMatch(/returning id/i);
    expect(recorder.calls[0]?.values).toContain(contextA.agencyId);
  });

  test("insertExcursion e filhos recebem agency_id do contexto, não do input", async () => {
    await insertExcursion(contextA, {
      destination: "Aparecida",
      originCity: null,
      departureAt: "2026-12-12T09:00:00.000Z",
      returnAt: null,
      vehicleCapacity: 2,
      seats: [
        { seatNumber: 1, rowIndex: 1, side: "left", position: "window" },
        { seatNumber: 2, rowIndex: 1, side: "left", position: "aisle" },
      ],
      boardingNames: ["Centro"],
    });
    const texts = recorder.calls.map((call) => call.sql).join("\n");
    expect(texts).toMatch(/insert into excursions/i);
    expect(texts).toMatch(/insert into boarding_points/i);
    expect(texts).toMatch(/insert into seats/i);
    expect(texts).toMatch(/agency_id/);
    expect(recorder.calls.some((call) => call.values.includes(contextA.agencyId))).toBe(true);
  });

  test("update/insert de filhos filtram pela agência e usam RETURNING", async () => {
    await updateExcursionRecord(contextA, {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
      destination: "Aparecida",
      originCity: null,
      departureAt: "2026-12-12T09:00:00.000Z",
      returnAt: null,
      status: "open",
    });
    await insertBoardingPoint(contextA, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1", "Rodoviária");
    await updatePassengerRecord(contextA, {
      id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
      excursionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
      fullName: "Maria",
      phone: null,
      documentType: "cpf",
      documentNumber: null,
      documentIssuer: null,
      boardingPointId: null,
    });
    await markInstallmentPaid(
      contextA,
      "dddddddd-dddd-4ddd-8ddd-ddddddddddd1",
      "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
      "bbbbbbbb-bbbb-4bbb-4ddd-ddddddddddd1",
    );
    expect(recorder.calls.length).toBeGreaterThan(3);
    for (const call of recorder.calls) {
      expect(call.sql.toLowerCase()).toContain("agency_id");
      expect(call.values).toContain(contextA.agencyId);
    }
  });

  test("sem linha no escopo, a escrita resulta em não encontrado", async () => {
    recorder.flags.empty = true;
    await expect(
      updateExcursionRecord(contextA, {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        destination: "Aparecida",
        originCity: null,
        departureAt: "2026-12-12T09:00:00.000Z",
        returnAt: null,
        status: "open",
      }),
    ).rejects.toBeInstanceOf(RecordNotFound);
  });
});
