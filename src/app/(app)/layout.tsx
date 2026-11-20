import { AppHeader } from "@/components/shell/app-header";
import { ExampleBanner } from "@/components/ui/example-banner";
import { todayInBrazil } from "@/lib/domain/dates";
import { loadAgencyData } from "@/lib/db/source";
import { projectDueAttention } from "@/lib/services/views";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const today = todayInBrazil();
  const loaded = await loadAgencyData(today);
  const attentionCount = loaded.ok
    ? projectDueAttention(loaded.data, today).length
    : null;
  const agencyName = loaded.ok ? (loaded.data.agency?.name ?? null) : null;

  return (
    <>
      <AppHeader
        attentionCount={attentionCount}
        agencyName={agencyName}
        agencyHref={loaded.ok && loaded.source === "database" ? "/agencia" : null}
      />
      {loaded.ok && loaded.source === "example" ? <ExampleBanner /> : null}
      <main className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-16 lg:px-8">
        {children}
      </main>
    </>
  );
}
