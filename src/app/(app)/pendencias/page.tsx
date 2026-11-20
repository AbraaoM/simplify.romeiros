import { AttentionList } from "@/components/dashboard/attention-list";
import { ErrorState } from "@/components/ui/error-state";
import { listDueAttention } from "@/lib/services/queries";

export const dynamic = "force-dynamic";

export default async function PendenciasPage() {
  const result = await listDueAttention();
  if (!result.ok) {
    return <ErrorState message="Não foi possível carregar as pendências." />;
  }

  return (
    <div>
      <h1 className="font-display text-5xl leading-[0.9] sm:text-6xl">Pendências</h1>
      <p className="mt-3 text-muted dark:text-faint">
        O que está atrasado ou vence hoje.
      </p>
      {result.data.length === 0 ? (
        <p className="mt-10">Nada para receber hoje.</p>
      ) : (
        <div className="mt-8">
          <AttentionList items={result.data} />
        </div>
      )}
    </div>
  );
}
