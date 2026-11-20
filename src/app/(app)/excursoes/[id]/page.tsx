import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExcursionDetail } from "@/components/excursions/excursion-detail";
import { ErrorState } from "@/components/ui/error-state";
import { getExcursionView } from "@/lib/services/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getExcursionView(id);
  if (!result.ok || !result.data) return { title: "Excursão — Simplify" };
  return { title: `${result.data.destination} — Simplify` };
}

export default async function ExcursionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getExcursionView(id);
  if (!result.ok) {
    return <ErrorState message="Não foi possível carregar esta excursão." />;
  }
  if (!result.data) notFound();
  return (
    <ExcursionDetail view={result.data} writable={result.source === "database"} />
  );
}
