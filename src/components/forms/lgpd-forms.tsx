"use client";

import { useEffect, useRef } from "react";
import {
  anonymizePassengerAction,
  exportPassengerAction,
  idleExportPassengerState,
} from "@/app/acoes";
import { FormError, SubmitButton, useFormAction, useStatefulFormAction } from "./fields";

export function ExportPassengerForm({
  excursionId,
  passengerId,
}: {
  excursionId: string;
  passengerId: string;
}) {
  const [state, action, pending] = useStatefulFormAction(
    exportPassengerAction,
    idleExportPassengerState,
  );
  const lastFile = useRef<string | null>(null);

  useEffect(() => {
    if (!state.file) return;
    const key = `${state.file.filename}:${state.file.content.length}`;
    if (lastFile.current === key) return;
    lastFile.current = key;
    const blob = new Blob([state.file.content], { type: state.file.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = state.file.filename;
    link.click();
    URL.revokeObjectURL(url);
  }, [state.file]);

  return (
    <form action={action} className="mt-10 max-w-md space-y-4 border-t border-line pt-8 dark:border-line-dark">
      <input type="hidden" name="excursionId" value={excursionId} />
      <input type="hidden" name="passengerId" value={passengerId} />
      <h2 className="font-display text-3xl leading-none">Exportar dados</h2>
      <p className="text-sm text-muted dark:text-faint">
        Baixa todos os dados deste passageiro, incluindo parcelas, em JSON ou CSV.
      </p>
      <label className="block">
        <span className="text-sm text-muted dark:text-faint">Formato</span>
        <select
          name="format"
          defaultValue="json"
          className="mt-1 w-full min-h-11 border border-line bg-paper px-3 text-base text-ink dark:border-line-dark dark:bg-ink dark:text-paper"
        >
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="confirm" value="yes" />
        <span>Confirmo a exportação dos dados deste passageiro</span>
      </label>
      <FormError message={state.message && !state.file ? state.message : null} />
      {state.file ? (
        <p className="text-sm text-ok dark:text-ok-soft">{state.message}</p>
      ) : null}
      <SubmitButton pending={pending} pendingLabel="Preparando.">
        Exportar
      </SubmitButton>
    </form>
  );
}

export function AnonymizePassengerForm({
  excursionId,
  passengerId,
}: {
  excursionId: string;
  passengerId: string;
}) {
  const [state, action, pending] = useFormAction(anonymizePassengerAction);
  return (
    <form action={action} className="mt-10 max-w-md space-y-4 border-t border-line pt-8 dark:border-line-dark">
      <input type="hidden" name="excursionId" value={excursionId} />
      <input type="hidden" name="passengerId" value={passengerId} />
      <h2 className="font-display text-3xl leading-none">Anonimizar</h2>
      <p className="text-sm text-muted dark:text-faint">
        Apaga nome, CPF, telefone e e-mail. As parcelas e os valores são
        mantidos para a conta da agência. Esta ação não pode ser desfeita.
      </p>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="confirm" value="yes" />
        <span>Confirmo a anonimização deste passageiro</span>
      </label>
      <FormError message={state.message} />
      <SubmitButton pending={pending} tone="plain" pendingLabel="Anonimizando.">
        Anonimizar passageiro
      </SubmitButton>
    </form>
  );
}
