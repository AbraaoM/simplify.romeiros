"use client";

import {
  createStaffInviteAction,
  revokeInviteAction,
  revokeStaffAction,
} from "@/app/acoes";
import { idleCreateInviteState } from "@/app/import-state";
import { FormError, SubmitButton, useFormAction, useStatefulFormAction } from "./fields";

export function CreateInviteForm({ agencyName }: { agencyName: string }) {
  const [state, action, pending] = useStatefulFormAction(
    createStaffInviteAction,
    idleCreateInviteState,
  );
  return (
    <form action={action} className="mt-6 max-w-md space-y-4">
      <input type="hidden" name="agencyName" value={agencyName} />
      <p className="text-sm text-muted dark:text-faint">
        O convite vale por 7 dias e só pode ser usado uma vez. O link aparece
        só agora; compartilhe pelo WhatsApp. Não enviamos e-mail.
      </p>
      <FormError message={state.message && !state.url ? state.message : null} />
      {state.url ? (
        <div className="space-y-3 border border-line p-4 text-sm dark:border-line-dark">
          <p className="text-ok dark:text-ok-soft">{state.message}</p>
          <p className="break-all">{state.url}</p>
          {state.whatsappUrl ? (
            <a
              href={state.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center underline"
            >
              Compartilhar no WhatsApp
            </a>
          ) : null}
        </div>
      ) : null}
      <SubmitButton pending={pending} pendingLabel="Criando convite.">
        Gerar convite
      </SubmitButton>
    </form>
  );
}

export function RevokeStaffForm({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [state, action, pending] = useFormAction(revokeStaffAction);
  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="userId" value={userId} />
      <FormError message={state.message} />
      <SubmitButton pending={pending} tone="plain" pendingLabel="Revogando.">
        {`Revogar ${name}`}
      </SubmitButton>
    </form>
  );
}

export function RevokeInviteForm({ inviteId }: { inviteId: string }) {
  const [state, action, pending] = useFormAction(revokeInviteAction);
  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="inviteId" value={inviteId} />
      <FormError message={state.message} />
      <SubmitButton pending={pending} tone="plain" pendingLabel="Revogando.">
        Revogar convite
      </SubmitButton>
    </form>
  );
}
