import type { Metadata } from "next";
import { AgencyForm } from "@/components/forms/agency-form";
import { ErrorState } from "@/components/ui/error-state";
import { loadAgencyData } from "@/lib/db/source";
import { NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: `Agência — ${NAME}` };

export default async function AgencyPage() {
  const loaded = await loadAgencyData();
  if (!loaded.ok) {
    return <ErrorState message="Não foi possível carregar a agência." />;
  }
  if (loaded.source !== "database") {
    return <p>O banco não está ligado.</p>;
  }

  const agency = loaded.data.agency;
  return (
    <article>
      <h1 className="font-display text-5xl leading-[1.1]">
        {agency ? agency.name : "Sua agência"}
      </h1>
      <AgencyForm
        agency={
          agency
            ? {
                name: agency.name,
                phone: agency.phone ?? "",
                city: agency.city ?? "",
                pixKey: agency.pixKey ?? "",
              }
            : null
        }
      />
    </article>
  );
}
