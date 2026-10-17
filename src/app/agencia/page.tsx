import type { Metadata } from "next";
import { AgencyForm } from "@/components/forms/agency-form";
import { ErrorState } from "@/components/ui/error-state";
import { todayInBrazil } from "@/lib/domain/dates";
import { loadAgencyData } from "@/lib/db/source";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Agência — Simplify" };

export default async function AgencyPage() {
  const loaded = await loadAgencyData(todayInBrazil());
  if (!loaded.ok) {
    return <ErrorState message="Não foi possível carregar a agência." />;
  }
  if (loaded.source !== "database") {
    return <p>O banco não está ligado.</p>;
  }

  const agency = loaded.data.agency;
  return (
    <article>
      <h1 className="font-display text-5xl leading-[0.9]">
        {agency ? agency.name : "Sua agência"}
      </h1>
      <AgencyForm
        agency={
          agency
            ? {
                name: agency.name,
                phone: agency.phone ?? "",
                city: agency.city ?? "",
              }
            : null
        }
      />
    </article>
  );
}
