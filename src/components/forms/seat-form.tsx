"use client";

import { assignSeatAction, releaseSeatAction } from "@/app/acoes";
import { FormError, SubmitButton, useFormAction } from "./fields";

export function SeatAssignForm({
  excursionId,
  seatId,
  choices,
}: {
  excursionId: string;
  seatId: string;
  choices: Array<{ id: string; fullName: string; seatNumber: number | null }>;
}) {
  const [state, action, pending] = useFormAction(assignSeatAction);
  return (
    <form action={action} className="mt-8 max-w-md space-y-4">
      <input type="hidden" name="excursionId" value={excursionId} />
      <input type="hidden" name="seatId" value={seatId} />
      <fieldset className="space-y-2">
        <legend className="text-sm text-muted dark:text-faint">Quem senta</legend>
        {choices.map((choice) => (
          <label key={choice.id} className="flex min-h-11 items-center gap-3">
            <input type="radio" name="passengerId" value={choice.id} required />
            <span>
              {choice.fullName}
              {choice.seatNumber ? ` · poltrona ${choice.seatNumber}` : ""}
            </span>
          </label>
        ))}
      </fieldset>
      <FormError message={state.message} />
      <SubmitButton pending={pending}>Sentar</SubmitButton>
    </form>
  );
}

export function ReleaseSeatForm({
  excursionId,
  seatId,
}: {
  excursionId: string;
  seatId: string;
}) {
  const [state, action, pending] = useFormAction(releaseSeatAction);
  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="excursionId" value={excursionId} />
      <input type="hidden" name="seatId" value={seatId} />
      <FormError message={state.message} />
      <SubmitButton pending={pending} tone="plain">
        Liberar poltrona
      </SubmitButton>
    </form>
  );
}
