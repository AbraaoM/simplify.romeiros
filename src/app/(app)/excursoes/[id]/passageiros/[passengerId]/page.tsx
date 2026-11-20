import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelPassengerForm } from "@/components/forms/cancel-form";
import { PassengerEditForm } from "@/components/forms/passenger-form";
import { InstallmentForm, MarkPaidForm } from "@/components/forms/payment-form";
import { PixCharge } from "@/components/payments/pix-charge";
import { StandingMark } from "@/components/ui/standing-mark";
import { ErrorState } from "@/components/ui/error-state";
import { paymentStanding } from "@/lib/domain/payment-standing";
import { formatDayMonth, todayInBrazil } from "@/lib/domain/dates";
import { formatDocumentMasked } from "@/lib/format/document";
import { formatBrl } from "@/lib/format/money";
import { AnonymizePassengerForm, ExportPassengerForm } from "@/components/forms/lgpd-forms";
import { resolveTenantContext } from "@/lib/security/context";
import { getPassengerFile } from "@/lib/services/queries";
import type { Installment } from "@/lib/domain/types";
import type { PassengerFile } from "@/lib/services/views";
import { NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; passengerId: string }>;
}): Promise<Metadata> {
  const { id, passengerId } = await params;
  const result = await getPassengerFile(id, passengerId);
  const name = result.ok ? result.data?.passenger.fullName : null;
  return { title: name ? `${name} — ${NAME}` : `Passageiro — ${NAME}` };
}

export default async function PassengerFilePage({
  params,
}: {
  params: Promise<{ id: string; passengerId: string }>;
}) {
  const { id, passengerId } = await params;
  const today = todayInBrazil();
  const result = await getPassengerFile(id, passengerId, today);
  if (!result.ok) {
    return <ErrorState message="Não foi possível carregar este passageiro." />;
  }
  if (!result.data) notFound();

  const file = result.data;
  const context = await resolveTenantContext();
  const isOwner = context.role === "owner";
  const anonymized = Boolean(file.passenger.anonymizedAt);
  const canAccount =
    result.source === "database" && file.passenger.status !== "cancelled";
  const writable = canAccount && !anonymized;
  const passenger = file.passenger;

  return (
    <article>
      <p className="text-sm text-muted dark:text-faint">{file.destination}</p>
      <h1 className="mt-2 font-display text-5xl leading-[1.1]">{passenger.fullName}</h1>
      <p className="mt-3">
        {file.seatNumber ? `Poltrona ${file.seatNumber}` : "Sem poltrona"}
      </p>
      <p className="mt-1 text-sm text-muted dark:text-faint">
        {formatDocumentMasked(passenger.documentType, passenger.documentNumber)}
      </p>
      {anonymized ? <p className="mt-4">Anonimizado</p> : null}
      {passenger.status === "cancelled" ? <p className="mt-4">Cancelado</p> : null}

      <h2 className="mt-10 font-display text-3xl leading-none">Parcelas</h2>
      {file.installments.length === 0 ? (
        <p className="mt-4">Nenhuma parcela.</p>
      ) : (
        <ul className="mt-4">
          {file.installments.map((installment) => (
            <li
              key={installment.id}
              className="border-b border-line py-4 dark:border-line-dark"
            >
              <p>
                {formatBrl(installment.amountCents)} · {formatDayMonth(installment.dueDate)}
              </p>
              <p className="mt-1 text-sm">
                <InstallmentStanding installment={installment} today={today} />
              </p>
              {installment.status === "pending" ? (
                <PendingPix
                  file={file}
                  installmentId={installment.id}
                  writable={canAccount}
                  canEditPixKey={isOwner}
                  excursionId={id}
                  passengerId={passengerId}
                  isPrimary={installment.id === file.pendingInstallmentId}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canAccount ? (
        <InstallmentForm excursionId={id} passengerId={passengerId} />
      ) : null}

      {writable ? (
        <>
          <PassengerEditForm
            excursionId={id}
            points={file.boardingPoints.map((point) => ({
              id: point.id,
              name: point.name,
            }))}
            passenger={{
              id: passenger.id,
              fullName: passenger.fullName,
              phone: passenger.phone ?? "",
              documentType: passenger.documentType,
              documentNumber: passenger.documentNumber ?? "",
              documentIssuer: passenger.documentIssuer ?? "",
              boardingPointId: passenger.boardingPointId ?? "",
            }}
          />
          <CancelPassengerForm excursionId={id} passengerId={passengerId} />
        </>
      ) : null}

      {result.source === "database" ? (
        <ExportPassengerForm excursionId={id} passengerId={passengerId} />
      ) : null}
      {result.source === "database" && isOwner && !anonymized ? (
        <AnonymizePassengerForm excursionId={id} passengerId={passengerId} />
      ) : null}

      <p className="mt-8">
        <Link href={`/excursoes/${id}`} className="inline-flex min-h-11 items-center">
          Voltar à excursão
        </Link>
      </p>
    </article>
  );
}

function PendingPix({
  file,
  installmentId,
  writable,
  canEditPixKey,
  excursionId,
  passengerId,
  isPrimary,
}: {
  file: PassengerFile;
  installmentId: string;
  writable: boolean;
  canEditPixKey: boolean;
  excursionId: string;
  passengerId: string;
  isPrimary: boolean;
}) {
  const charge = file.pixCharges.find((item) => item.installmentId === installmentId);
  return (
    <>
      {file.pixKeyConfigured && charge ? (
        <PixCharge
          payload={charge.payload}
          message={charge.whatsappMessage}
          phone={file.passenger.phone}
        />
      ) : writable && canEditPixKey ? (
        <p className="mt-3 text-sm text-muted dark:text-faint">
          Para gerar o Pix copia e cola,{" "}
          <Link href="/agencia" className="underline">
            cadastre a chave Pix da agência
          </Link>
          .
        </p>
      ) : null}
      {writable && isPrimary ? (
        <MarkPaidForm
          excursionId={excursionId}
          passengerId={passengerId}
          installmentId={installmentId}
        />
      ) : null}
    </>
  );
}

function InstallmentStanding({
  installment,
  today,
}: {
  installment: Installment;
  today: string;
}) {
  if (installment.status === "paid") {
    return <span className="text-ok dark:text-ok-soft">Paga</span>;
  }
  if (installment.status === "waived") return "Dispensada";
  if (installment.status === "cancelled") return "Cancelada";
  return <StandingMark standing={paymentStanding([installment], today)} />;
}
