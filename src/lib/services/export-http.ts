import "server-only";
import { NextResponse } from "next/server";
import { calendarDateInBrazil } from "@/lib/domain/dates";
import {
  ANTT_DISCLAIMER,
  anttPassengersCsv,
  anttPassengersPdf,
  passengersCsv,
  passengersPdf,
} from "@/lib/domain/export-lists";
import { insertAuditLog } from "@/lib/repositories/audit";
import { resolveTenantContext } from "@/lib/security/context";
import { getPassengerExport } from "@/lib/services/queries";

export type ExportKind = "passengers-csv" | "passengers-pdf" | "antt-csv" | "antt-pdf";

export async function passengerExportResponse(
  request: Request,
  excursionId: string,
  kind: ExportKind,
): Promise<Response> {
  const result = await getPassengerExport(excursionId);
  if (!result.ok) {
    if (result.error === "unauthenticated") {
      return NextResponse.redirect(new URL("/entrar", request.url));
    }
    return new NextResponse("Não foi possível gerar a lista.", { status: 500 });
  }
  if (!result.data) {
    return new NextResponse("Não encontrado.", { status: 404 });
  }

  const day = calendarDateInBrazil(result.data.departureAt);
  const slug = fileSlug(result.data.destination);
  const title = result.data.destination;
  const subtitle = `${result.data.destination} · ${day}`;

  if (kind === "passengers-csv") {
    return fileResponse(
      passengersCsv(result.data.rows),
      `caravaneiro-${slug}-passageiros.csv`,
      "text/csv; charset=utf-8",
    );
  }
  if (kind === "antt-csv" || kind === "antt-pdf") {
    const context = await resolveTenantContext();
    await insertAuditLog(context, {
      action: "export_antt",
      entity: "excursion",
      entityId: excursionId,
      payload: { kind },
    });
  }

  if (kind === "antt-csv") {
    return fileResponse(
      anttPassengersCsv(result.data.rows),
      `caravaneiro-${slug}-antt.csv`,
      "text/csv; charset=utf-8",
    );
  }
  if (kind === "antt-pdf") {
    return fileResponse(
      anttPassengersPdf(`Lista ANTT — ${title}`, subtitle, result.data.rows),
      `caravaneiro-${slug}-antt.pdf`,
      "application/pdf",
    );
  }
  return fileResponse(
    passengersPdf(`Lista de passageiros — ${title}`, subtitle, result.data.rows, ANTT_DISCLAIMER),
    `caravaneiro-${slug}-passageiros.pdf`,
    "application/pdf",
  );
}

function fileResponse(body: string | Uint8Array, filename: string, contentType: string): Response {
  const payload = typeof body === "string" ? new TextEncoder().encode(body) : body;
  return new NextResponse(Buffer.from(payload), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function fileSlug(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "excursao";
}
