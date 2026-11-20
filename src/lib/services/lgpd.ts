import "server-only";
import {
  buildPassengerExportSnapshot,
  passengerExportCsv,
  type PassengerExportSnapshot,
} from "@/lib/domain/lgpd";
import { insertAuditLog } from "@/lib/repositories/audit";
import { anonymizePassengerRecord } from "@/lib/repositories/lgpd";
import { readAgencyFromDatabase } from "@/lib/repositories/agency";
import { resolveTenantContext, requireOwner } from "@/lib/security/context";
import {
  DB_OFF,
  NOT_FOUND,
  OWNER_ONLY,
  SAVE_FAILED,
  SESSION_REQUIRED,
  SecurityError,
  isSecurityError,
} from "@/lib/security/errors";
import type { ServiceResult } from "@/lib/services/commands";

function deny(error: unknown): { ok: false; message: string } {
  if (error instanceof SecurityError) {
    if (error.code === "unauthenticated" || error.code === "unconfigured") {
      return { ok: false, message: SESSION_REQUIRED };
    }
    if (error.code === "database") {
      return { ok: false, message: DB_OFF };
    }
    if (error.code === "forbidden") {
      return { ok: false, message: error.message || OWNER_ONLY };
    }
    return { ok: false, message: SESSION_REQUIRED };
  }
  console.error("Falha ao ler o banco.");
  return { ok: false, message: SAVE_FAILED };
}

function fail(error: unknown): { ok: false; message: string } {
  if (isSecurityError(error)) return deny(error);
  console.error("Falha ao gravar no banco.");
  return { ok: false, message: SAVE_FAILED };
}

export type ExportPassengerResult = ServiceResult<{
  filename: string;
  mime: string;
  content: string;
}>;

export async function exportPassengerData(input: {
  excursionId: string;
  passengerId: string;
  format: "json" | "csv";
  confirmed: boolean;
}): Promise<ExportPassengerResult> {
  if (!input.confirmed) {
    return { ok: false, message: "Confirme a exportação dos dados deste passageiro." };
  }
  const format = input.format === "csv" ? "csv" : "json";
  try {
    const context = await resolveTenantContext();
    const data = await readAgencyFromDatabase(context);
    const passenger = data.passengers.find(
      (item) => item.id === input.passengerId && item.excursionId === input.excursionId,
    );
    if (!passenger) {
      return { ok: false, message: NOT_FOUND };
    }
    const snapshot: PassengerExportSnapshot = buildPassengerExportSnapshot({
      passenger,
      installments: data.installments,
      seats: data.seats,
      boardingPoints: data.boardingPoints,
    });
    await insertAuditLog(context, {
      action: "export_passenger",
      entity: "passenger",
      entityId: passenger.id,
      payload: { format },
    });
    if (format === "csv") {
      return {
        ok: true,
        filename: `caravaneiro-passageiro-${passenger.id}.csv`,
        mime: "text/csv; charset=utf-8",
        content: passengerExportCsv(snapshot),
      };
    }
    return {
      ok: true,
      filename: `caravaneiro-passageiro-${passenger.id}.json`,
      mime: "application/json; charset=utf-8",
      content: `${JSON.stringify(snapshot, null, 2)}\n`,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function anonymizePassenger(input: {
  excursionId: string;
  passengerId: string;
  confirmed: boolean;
}): Promise<ServiceResult> {
  if (!input.confirmed) {
    return { ok: false, message: "Confirme a anonimização deste passageiro." };
  }
  try {
    const context = await resolveTenantContext();
    requireOwner(context);
    const result = await anonymizePassengerRecord(context, {
      excursionId: input.excursionId,
      passengerId: input.passengerId,
    });
    if (!result.ok) {
      if (result.reason === "missing") {
        return { ok: false, message: NOT_FOUND };
      }
      return { ok: false, message: "Este passageiro já foi anonimizado." };
    }
    await insertAuditLog(context, {
      action: "anonymize_passenger",
      entity: "passenger",
      entityId: input.passengerId,
    });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
