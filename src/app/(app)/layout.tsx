import { redirect } from "next/navigation";
import { AppHeader } from "@/components/shell/app-header";
import { ErrorState } from "@/components/ui/error-state";
import { todayInBrazil } from "@/lib/domain/dates";
import { loadAgencyData } from "@/lib/db/source";
import { resolveTenantContext } from "@/lib/security/context";
import { isSecurityError } from "@/lib/security/errors";
import { projectDueAttention } from "@/lib/services/views";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await resolveTenantContext();
  } catch (error) {
    if (
      isSecurityError(error) &&
      (error.code === "unauthenticated" || error.code === "unconfigured")
    ) {
      redirect("/entrar");
    }
    if (
      isSecurityError(error) &&
      (error.code === "no_membership" || error.code === "ambiguous_membership")
    ) {
      return (
        <main className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-16 lg:px-8">
          <ErrorState message="Não foi possível liberar o acesso desta conta." />
        </main>
      );
    }
    return (
      <main className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-16 lg:px-8">
        <ErrorState message="Não foi possível carregar o painel." />
      </main>
    );
  }

  const today = todayInBrazil();
  const loaded = await loadAgencyData();
  const attentionCount = loaded.ok
    ? projectDueAttention(loaded.data, today).length
    : null;
  const agencyName = loaded.ok ? (loaded.data.agency?.name ?? null) : null;

  return (
    <>
      <AppHeader
        attentionCount={attentionCount}
        agencyName={agencyName}
        agencyHref="/agencia"
      />
      <main className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-16 lg:px-8">
        {children}
      </main>
    </>
  );
}
