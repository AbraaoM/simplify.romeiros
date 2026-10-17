import Link from "next/link";
import { AttentionList } from "@/components/dashboard/attention-list";
import { Headline } from "@/components/dashboard/headline";
import { TripList } from "@/components/dashboard/trip-list";
import { ErrorState } from "@/components/ui/error-state";
import { PrimaryLink } from "@/components/ui/primary-link";
import { getDashboard } from "@/lib/services/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await getDashboard();
  if (!result.ok) {
    return <ErrorState message="Não foi possível carregar as excursões." />;
  }

  const { headline, trips, attention, agencyName } = result.data;
  const writable = result.source === "database";
  const needsAction = headline.kind === "overdue" || headline.kind === "due_today";

  return (
    <div>
      <Headline headline={headline} />
      {writable && !agencyName ? (
        <div className="mt-8">
          <PrimaryLink href="/agencia">Cadastrar agência</PrimaryLink>
        </div>
      ) : null}
      {writable && agencyName && trips.length === 0 && !needsAction ? (
        <div className="mt-8">
          <PrimaryLink href="/excursoes/nova">Nova excursão</PrimaryLink>
        </div>
      ) : null}
      {trips.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-sm text-muted dark:text-faint">Excursões abertas</h2>
          <TripList trips={trips} />
        </section>
      ) : null}
      {attention.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-sm text-muted dark:text-faint">Para hoje</h2>
          <div className="mt-2">
            <AttentionList items={attention} />
          </div>
          {needsAction ? (
            <div className="mt-6">
              <PrimaryLink href="/pendencias">Ver pendências</PrimaryLink>
            </div>
          ) : null}
        </section>
      ) : null}
      {writable && agencyName && (trips.length > 0 || needsAction) ? (
        <p className="mt-8">
          <Link href="/excursoes/nova" className="inline-flex min-h-11 items-center">
            Nova excursão
          </Link>
        </p>
      ) : null}
    </div>
  );
}
