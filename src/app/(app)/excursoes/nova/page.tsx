import type { Metadata } from "next";
import Link from "next/link";
import { NewExcursionForm } from "@/components/forms/excursion-form";
import { ErrorState } from "@/components/ui/error-state";
import { loadAgencyData } from "@/lib/db/source";
import { NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: `Nova excursão — ${NAME}` };

export default async function NewExcursionPage() {
  const loaded = await loadAgencyData();
  if (!loaded.ok) {
    if (loaded.error === "unauthenticated") {
      return (
        <article>
          <h1 className="font-display text-5xl leading-[1.1]">Nova excursão</h1>
          <p className="mt-4 text-muted dark:text-faint">
            Modo teste: você pode preencher o formulário. Para salvar a excursão de forma permanente, crie uma conta.
          </p>
          <NewExcursionForm />
          <p className="mt-8">
            <Link href="/cadastrar" className="inline-flex min-h-11 items-center text-sm underline">
              Criar conta grátis
            </Link>
          </p>
        </article>
      );
    }
    return <ErrorState message="Não foi possível abrir o cadastro." />;
  }
  if (loaded.source !== "database") {
    return <p>O banco não está ligado.</p>;
  }
  if (!loaded.data.agency) {
    return (
      <article>
        <h1 className="font-display text-5xl leading-[1.1]">Nova excursão</h1>
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
      <h1 className="font-display text-5xl leading-[1.1]">Nova excursão</h1>
      <NewExcursionForm />
    </article>
  );
}
