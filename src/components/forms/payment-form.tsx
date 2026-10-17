"use client";

import { addInstallmentAction, markPaidAction } from "@/app/acoes";
import { FormError, SubmitButton, TextField, useFormAction } from "./fields";

export function MarkPaidForm({
  excursionId,
  passengerId,
  installmentId,
}: {
  excursionId: string;
  passengerId: string;
  installmentId: string;
}) {
  const [state, action, pending] = useFormAction(markPaidAction);
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="excursionId" value={excursionId} />
      <input type="hidden" name="passengerId" value={passengerId} />
      <input type="hidden" name="installmentId" value={installmentId} />
      <FormError message={state.message} />
      <SubmitButton pending={pending}>Marcar paga</SubmitButton>
    </form>
  );
}

export function InstallmentForm({
  excursionId,
  passengerId,
}: {
  excursionId: string;
  passengerId: string;
}) {
  const [state, action, pending] = useFormAction(addInstallmentAction);
  return (
    <form action={action} className="mt-6 max-w-md space-y-5">
      <input type="hidden" name="excursionId" value={excursionId} />
      <input type="hidden" name="passengerId" value={passengerId} />
      <TextField label="Nova parcela" name="amount" required />
      <TextField label="Vencimento" name="dueDate" type="date" required />
      <FormError message={state.message} />
      <SubmitButton pending={pending} tone="plain">
        Lançar parcela
      </SubmitButton>
    </form>
  );
}
