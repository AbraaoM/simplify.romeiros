"use client";

import { createExcursionAction, updateExcursionAction } from "@/app/acoes";
import { EXCURSION_STATUS_LABEL } from "@/lib/format/labels";
import type { ExcursionStatus } from "@/lib/domain/types";
import {
  AreaField,
  FormError,
  SelectField,
  SubmitButton,
  TextField,
  useFormAction,
} from "./fields";

const STATUSES = Object.entries(EXCURSION_STATUS_LABEL) as Array<
  [ExcursionStatus, string]
>;

export function NewExcursionForm() {
  const [state, action, pending] = useFormAction(createExcursionAction);
  return (
    <form action={action} className="mt-8 max-w-md space-y-5">
      <TextField label="Destino" name="destination" required />
      <TextField label="Cidade de saída" name="originCity" />
      <TextField label="Ida" name="departureDate" type="date" required />
      <TextField label="Volta" name="returnDate" type="date" />
      <TextField label="Lugares" name="capacity" type="number" defaultValue="44" required />
      <AreaField label="Pontos de embarque, um por linha" name="boarding" />
      <FormError message={state.message} />
      <SubmitButton pending={pending}>Abrir excursão</SubmitButton>
    </form>
  );
}

export function ExcursionSettingsForm({
  excursion,
}: {
  excursion: {
    id: string;
    destination: string;
    originCity: string;
    departureDate: string;
    returnDate: string;
    status: ExcursionStatus;
  };
}) {
  const [state, action, pending] = useFormAction(updateExcursionAction);
  return (
    <form action={action} className="mt-10 max-w-md space-y-5 border-t border-line pt-8 dark:border-line-dark">
      <h2 className="font-display text-3xl leading-none">A excursão</h2>
      <input type="hidden" name="id" value={excursion.id} />
      <TextField label="Destino" name="destination" defaultValue={excursion.destination} required />
      <TextField label="Cidade de saída" name="originCity" defaultValue={excursion.originCity} />
      <TextField label="Ida" name="departureDate" type="date" defaultValue={excursion.departureDate} required />
      <TextField label="Volta" name="returnDate" type="date" defaultValue={excursion.returnDate} />
      <SelectField
        label="Situação"
        name="status"
        defaultValue={excursion.status}
        options={STATUSES.map(([value, label]) => ({ value, label }))}
      />
      <FormError message={state.message} />
      <SubmitButton pending={pending} tone="plain">
        Salvar excursão
      </SubmitButton>
    </form>
  );
}
