import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelPassengerForm } from "@/components/forms/cancel-form";
import { PassengerEditForm } from "@/components/forms/passenger-form";
import { InstallmentForm, MarkPaidForm } from "@/components/forms/payment-form";
import { StandingMark } from "@/components/ui/standing-mark";
import { ErrorState } from "@/components/ui/error-state";
import { paymentStanding } from "@/lib/domain/payment-standing";
import { formatDayMonth, todayInBrazil } from "@/lib/domain/dates";
import { formatDocument } from "@/lib/format/document";
import { formatBrl } from "@/lib/format/money";
import { getPassengerFile } from "@/lib/services/queries";
import type { Installment } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; passengerId: string }>;
}): Promise<Metadata> {
  const { id, passengerId } = await params;
  const result = await getPassengerFile(id, passengerId);
  const name = result.ok ? result.data?.passenger.fullName : null;
  return { title: name ? `${name} — Simplify` : "Passageiro — Simplify" };
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
  const writable = result.source === "database" && file.passenger.status !== "cancelled";
  const passenger = file.passenger;

  return (
    <article>
      <p className="text-sm text-muted dark:text-faint">{file.destination}</p>
      <h1 className="mt-2 font-display text-5xl leading-[0.9]">{passenger.fullName}</h1>
      <p className="mt-3">
        {file.seatNumber ? `Poltrona ${file.seatNumber}` : "Sem poltrona"}
      </p>
      <p className="mt-1 text-sm text-muted dark:text-faint">
        {formatDocument(passenger.documentType, passenger.documentNumber)}
      </p>
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
              {writable && installment.id === file.pendingInstallmentId ? (
                <MarkPaidForm
                  excursionId={id}
                  passengerId={passengerId}
                  installmentId={installment.id}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {writable ? (
        <>
          <InstallmentForm excursionId={id} passengerId={passengerId} />
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

      <p className="mt-8">
        <Link href={`/excursoes/${id}`} className="inline-flex min-h-11 items-center">
          Voltar à excursão
        </Link>
      </p>
    </article>
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
