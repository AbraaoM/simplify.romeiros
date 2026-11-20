import { passengerExportResponse, type ExportKind } from "@/lib/services/export-http";

export const dynamic = "force-dynamic";

const kind = "passengers-pdf" as const satisfies ExportKind;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return passengerExportResponse(request, id, kind);
}
