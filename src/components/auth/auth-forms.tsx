"use client";

import Link from "next/link";
import {
  FormError,
  SubmitButton,
  TextField,
  useFormAction,
} from "@/components/forms/fields";
import { signInAction, signUpAction } from "@/lib/auth/actions";
import { trialLabel } from "@/lib/brand";

export function SignInForm() {
  const [state, action, pending] = useFormAction(signInAction);
  return (
    <form action={action} className="space-y-5">
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
        Entrar
      </SubmitButton>
      <p className="text-sm text-muted dark:text-faint">
        Ainda não tem conta?{" "}
        <Link href="/cadastrar" className="text-ink underline dark:text-paper">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useFormAction(signUpAction);
  return (
    <form action={action} className="space-y-5">
      <TextField
        label="Seu nome"
        name="name"
        required
        autoComplete="name"
      />
      <TextField
        label="Nome da agência"
        name="agencyName"
        required
        autoComplete="organization"
      />
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
      <p className="text-sm text-muted dark:text-faint">
        {trialLabel()}. Sem cobrança neste cadastro.
      </p>
      <FormError message={state.message} />
      <SubmitButton pending={pending} pendingLabel="Criando conta.">
        Criar conta
      </SubmitButton>
      <p className="text-sm text-muted dark:text-faint">
        Já tem cadastro?{" "}
        <Link href="/entrar" className="text-ink underline dark:text-paper">
          Entrar
        </Link>
      </p>
    </form>
  );
}
