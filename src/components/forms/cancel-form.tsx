"use client";

import { cancelPassengerAction } from "@/app/acoes";
import { FormError, SubmitButton, useFormAction } from "./fields";

export function CancelPassengerForm({
  excursionId,
  passengerId,
}: {
  excursionId: string;
  passengerId: string;
}) {
  const [state, action, pending] = useFormAction(cancelPassengerAction);
  return (
    <form action={action} className="mt-10 max-w-md space-y-4 border-t border-line pt-8 dark:border-line-dark">
      <input type="hidden" name="excursionId" value={excursionId} />
      <input type="hidden" name="passengerId" value={passengerId} />
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="confirm" value="yes" />
        <span>Confirmo o cancelamento</span>
      </label>
      <FormError message={state.message} />
      <SubmitButton pending={pending} tone="plain">
        Cancelar passageiro
      </SubmitButton>
    </form>
  );
}
