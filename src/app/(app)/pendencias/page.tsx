import Link from "next/link";
import { AttentionList } from "@/components/dashboard/attention-list";
import { ErrorState } from "@/components/ui/error-state";
import { listDueAttention } from "@/lib/services/queries";

export const dynamic = "force-dynamic";

export default async function PendenciasPage() {
  const result = await listDueAttention();
  if (!result.ok) {
    if (result.error === "unauthenticated") {
      return (
        <div>
          <h1 className="font-display text-5xl leading-[1.1] sm:text-6xl">Pendências</h1>
          <p className="mt-3 text-muted dark:text-faint">
            Modo teste: sem login não há parcelas cadastradas.
          </p>
          <p className="mt-8">
            <Link href="/cadastrar" className="inline-flex min-h-11 items-center underline">
              Criar conta para começar
            </Link>
          </p>
        </div>
      );
    }
    return <ErrorState message="Não foi possível carregar as pendências." />;
  }

  return (
    <div>
      <h1 className="font-display text-5xl leading-[1.1] sm:text-6xl">Pendências</h1>
      <p className="mt-3 text-muted dark:text-faint">
        Parcelas atrasadas e as que vencem nos próximos 7 dias.
      </p>
      {result.data.length === 0 ? (
        <p className="mt-10">Nenhuma parcela vencida ou a vencer em 7 dias.</p>
      ) : (
        <div className="mt-8">
          <AttentionList items={result.data} />
        </div>
      )}
    </div>
  );
}
