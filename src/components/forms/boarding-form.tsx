"use client";

import { addBoardingPointAction } from "@/app/acoes";
import { FormError, SubmitButton, TextField, useFormAction } from "./fields";

export function BoardingForm({
  excursionId,
  points,
}: {
  excursionId: string;
  points: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useFormAction(addBoardingPointAction);
  return (
    <section className="mt-10 border-t border-line pt-8 dark:border-line-dark">
      <h2 className="font-display text-3xl leading-none">Embarques</h2>
      {points.length > 0 ? (
        <ul className="mt-4">
          {points.map((point) => (
            <li key={point.id} className="border-b border-line py-3 dark:border-line-dark">
              {point.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted dark:text-faint">Nenhum ponto de embarque.</p>
      )}
      <form action={action} className="mt-5 max-w-md space-y-5">
        <input type="hidden" name="excursionId" value={excursionId} />
        <TextField label="Novo ponto" name="name" required />
        <FormError message={state.message} />
        <SubmitButton pending={pending} tone="plain">
          Incluir embarque
        </SubmitButton>
      </form>
    </section>
  );
}
