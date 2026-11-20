import type { Metadata } from "next";
import { AgencyForm } from "@/components/forms/agency-form";
import { CreateInviteForm, RevokeStaffForm } from "@/components/forms/invite-forms";
import { ErrorState } from "@/components/ui/error-state";
import { loadAgencyData } from "@/lib/db/source";
import { INVITE_TTL_DAYS } from "@/lib/domain/invites";
import { calendarDateInBrazil, formatDayMonth } from "@/lib/domain/dates";
import { resolveTenantContext } from "@/lib/security/context";
import { OWNER_ONLY } from "@/lib/security/errors";
import { loadStaffAdmin } from "@/lib/services/staff";
import { NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: `Agência — ${NAME}` };

export default async function AgencyPage() {
  const context = await resolveTenantContext();
  if (context.role !== "owner") {
    return (
      <article>
        <h1 className="font-display text-5xl leading-[1.1]">Agência</h1>
        <p className="mt-6">{OWNER_ONLY}</p>
      </article>
    );
  }

  const loaded = await loadAgencyData();
  if (!loaded.ok) {
    return <ErrorState message="Não foi possível carregar a agência." />;
  }
  if (loaded.source !== "database") {
    return <p>O banco não está ligado.</p>;
  }

  const agency = loaded.data.agency;
  const staff = await loadStaffAdmin();

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

      <h2 className="mt-16 font-display text-3xl leading-none">Equipe</h2>
      <p className="mt-3 text-sm text-muted dark:text-faint">
        Só o dono vê esta área, a chave Pix e os convites.
      </p>

      {staff.ok ? (
        <ul className="mt-6 max-w-md">
          {staff.members.map((member) => (
            <li
              key={member.userId}
              className="border-b border-line py-4 dark:border-line-dark"
            >
              <p>{member.name}</p>
              <p className="mt-1 text-sm text-muted dark:text-faint">
                {member.email} · {member.role === "owner" ? "Dono" : "Funcionário"}
                {member.status === "revoked" ? " · revogado" : ""}
              </p>
              {member.role === "staff" && member.status === "active" ? (
                <RevokeStaffForm userId={member.userId} name={member.name} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4">{staff.message}</p>
      )}

      <h2 className="mt-12 font-display text-3xl leading-none">Convites</h2>
      <CreateInviteForm agencyName={agency?.name ?? NAME} />

      {staff.ok && staff.invites.length > 0 ? (
        <ul className="mt-8 max-w-md">
          {staff.invites.map((invite) => (
            <li
              key={invite.id}
              className="border-b border-line py-4 text-sm dark:border-line-dark"
            >
              <p>
                {invite.status === "accepted"
                  ? "Aceito"
                  : invite.status === "expired"
                    ? "Expirado"
                    : `Pendente · vale ${INVITE_TTL_DAYS} dias`}
              </p>
              <p className="mt-1 text-muted dark:text-faint">
                Criado em {formatDayMonth(calendarDateInBrazil(invite.createdAt))}
                {invite.acceptedAt
                  ? ` · aceito em ${formatDayMonth(calendarDateInBrazil(invite.acceptedAt))}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
