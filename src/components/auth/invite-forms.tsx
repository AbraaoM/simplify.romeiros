"use client";

import {
  FormError,
  SubmitButton,
  TextField,
  useFormAction,
} from "@/components/forms/fields";
import {
  acceptInviteAction,
  signInWithInviteAction,
  signUpWithInviteAction,
} from "@/lib/auth/actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useFormAction(acceptInviteAction);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <FormError message={state.message} />
      <SubmitButton pending={pending} pendingLabel="Aceitando.">
        Aceitar convite
      </SubmitButton>
    </form>
  );
}

export function SignInWithInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useFormAction(signInWithInviteAction);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <TextField
        label="E-mail"
        name="email"
        type="email"
        required
        autoComplete="email"
      />
      <TextField
        label="Senha"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        minLength={8}
      />
      <FormError message={state.message} />
      <SubmitButton pending={pending} pendingLabel="Entrando.">
        Entrar e aceitar
      </SubmitButton>
    </form>
  );
}

export function SignUpWithInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useFormAction(signUpWithInviteAction);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <TextField label="Seu nome" name="name" required autoComplete="name" />
      <TextField
        label="E-mail"
        name="email"
        type="email"
        required
        autoComplete="email"
      />
      <TextField
        label="Senha"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        minLength={8}
      />
      <FormError message={state.message} />
      <SubmitButton pending={pending} pendingLabel="Criando conta.">
        Criar conta e aceitar
      </SubmitButton>
    </form>
  );
}
