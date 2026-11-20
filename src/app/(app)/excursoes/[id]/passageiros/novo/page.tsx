import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewPassengerForm } from "@/components/forms/passenger-form";
import { ErrorState } from "@/components/ui/error-state";
import { getExcursionView } from "@/lib/services/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Novo passageiro — Simplify" };

export default async function NewPassengerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getExcursionView(id);
  if (!result.ok) {
    return <ErrorState message="Não foi possível abrir o cadastro." />;
  }
  if (!result.data) notFound();
  if (result.source !== "database") {
    return <p>O banco não está ligado.</p>;
  }

  return (
    <article>
      <p className="text-sm text-muted dark:text-faint">{result.data.destination}</p>
      <h1 className="mt-2 font-display text-5xl leading-[0.9]">Novo passageiro</h1>
      <NewPassengerForm excursionId={id} points={result.data.boardingPoints} />
      <p className="mt-8">
        <Link href={`/excursoes/${id}`} className="inline-flex min-h-11 items-center">
          Voltar à excursão
        </Link>
      </p>
    </article>
  );
}
