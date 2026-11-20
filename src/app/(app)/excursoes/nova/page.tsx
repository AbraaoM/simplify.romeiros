import type { Metadata } from "next";
import Link from "next/link";
import { NewExcursionForm } from "@/components/forms/excursion-form";
import { ErrorState } from "@/components/ui/error-state";
import { todayInBrazil } from "@/lib/domain/dates";
import { loadAgencyData } from "@/lib/db/source";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nova excursão — Simplify" };

export default async function NewExcursionPage() {
  const loaded = await loadAgencyData(todayInBrazil());
  if (!loaded.ok) {
    return <ErrorState message="Não foi possível abrir o cadastro." />;
  }
  if (loaded.source !== "database") {
    return <p>O banco não está ligado.</p>;
  }
  if (!loaded.data.agency) {
    return (
      <article>
        <h1 className="font-display text-5xl leading-[0.9]">Nova excursão</h1>
        <p className="mt-4">Cadastre a agência antes de abrir uma excursão.</p>
        <p className="mt-6">
          <Link href="/agencia" className="inline-flex min-h-11 items-center">
            Cadastrar agência
          </Link>
        </p>
      </article>
    );
  }

  return (
    <article>
      <h1 className="font-display text-5xl leading-[0.9]">Nova excursão</h1>
      <NewExcursionForm />
    </article>
  );
}
