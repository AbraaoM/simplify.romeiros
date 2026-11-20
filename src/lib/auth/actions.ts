"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { getAuth, isAuthConfigured } from "@/lib/auth/server";
import { deleteOrphanUser, provisionOwnerAgency } from "@/lib/auth/provision";
import {
  INVITE_INVALID,
  INVITE_REQUIRED,
} from "@/lib/domain/invites";
import {
  InviteError,
  acceptInviteForUser,
} from "@/lib/repositories/invites";
import { requireName } from "@/lib/domain/commands";
import type { ActionState } from "@/lib/services/action-state";

const AUTH_UNAVAILABLE = "O acesso ainda não está ligado.";
const GENERIC_SIGN_IN = "E-mail ou senha inválidos.";
const GENERIC_SIGN_UP = "Não foi possível criar a conta. Se você já tem cadastro, entre.";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function passwordError(password: string): string | null {
  if (password.length < 8) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }
  return null;
}

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isAuthConfigured()) return { message: AUTH_UNAVAILABLE };
  const email = normalizeEmail(text(formData, "email"));
  const password = text(formData, "password");
  if (!email || !password) {
    return { message: "Informe e-mail e senha." };
  }
  try {
    await getAuth().api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { message: GENERIC_SIGN_IN };
    }
    console.error("Falha no login.");
    return { message: GENERIC_SIGN_IN };
  }
  redirect("/");
}

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isAuthConfigured()) return { message: AUTH_UNAVAILABLE };
  const personName = requireName(text(formData, "name"));
  if (!personName.ok) return { message: personName.message };
  const agencyName = requireName(text(formData, "agencyName"));
  if (!agencyName.ok) return { message: "Informe o nome da agência." };
  const email = normalizeEmail(text(formData, "email"));
  if (!email || !email.includes("@")) {
    return { message: "Informe um e-mail válido." };
  }
  const password = text(formData, "password");
  const passwordProblem = passwordError(password);
  if (passwordProblem) return { message: passwordProblem };

  let userId: string | null = null;
  try {
    const created = await getAuth().api.signUpEmail({
      body: {
        name: personName.name,
        email,
        password,
      },
      headers: await headers(),
    });
    userId = created.user.id;
    await provisionOwnerAgency({
      userId,
      agencyName: agencyName.name,
    });
  } catch (error) {
    if (userId) {
      try {
        await deleteOrphanUser(userId);
      } catch {
        console.error("Falha ao desfazer cadastro incompleto.");
      }
    }
    if (error instanceof APIError) {
      return { message: GENERIC_SIGN_UP };
    }
    console.error("Falha no cadastro.");
    return { message: GENERIC_SIGN_UP };
  }
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  if (isAuthConfigured()) {
    try {
      await getAuth().api.signOut({
        headers: await headers(),
      });
    } catch {
      console.error("Falha ao encerrar a sessão.");
    }
  }
  redirect("/entrar");
}

function inviteToken(formData: FormData): string {
  return text(formData, "token").trim();
}

async function acceptAfterAuth(userId: string, token: string): Promise<ActionState | null> {
  if (!token) return { message: INVITE_REQUIRED };
  try {
    await acceptInviteForUser(userId, token);
    return null;
  } catch (error) {
    if (error instanceof InviteError) {
      return { message: error.message };
    }
    console.error("Falha ao aceitar convite.");
    return { message: INVITE_INVALID };
  }
}

export async function acceptInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isAuthConfigured()) return { message: AUTH_UNAVAILABLE };
  const token = inviteToken(formData);
  if (!token) return { message: INVITE_REQUIRED };
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;
    if (!userId) {
      return { message: "Entre ou crie uma conta para aceitar o convite." };
    }
    const accepted = await acceptAfterAuth(userId, token);
    if (accepted) return accepted;
  } catch (error) {
    if (error instanceof InviteError) {
      return { message: error.message };
    }
    console.error("Falha ao aceitar convite.");
    return { message: INVITE_INVALID };
  }
  redirect("/");
}

export async function signInWithInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isAuthConfigured()) return { message: AUTH_UNAVAILABLE };
  const token = inviteToken(formData);
  if (!token) return { message: INVITE_REQUIRED };
  const email = normalizeEmail(text(formData, "email"));
  const password = text(formData, "password");
  if (!email || !password) {
    return { message: "Informe e-mail e senha." };
  }
  try {
    await getAuth().api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;
    if (!userId) return { message: GENERIC_SIGN_IN };
    const accepted = await acceptAfterAuth(userId, token);
    if (accepted) return accepted;
  } catch (error) {
    if (error instanceof InviteError) {
      return { message: error.message };
    }
    if (error instanceof APIError) {
      return { message: GENERIC_SIGN_IN };
    }
    console.error("Falha no login com convite.");
    return { message: GENERIC_SIGN_IN };
  }
  redirect("/");
}

export async function signUpWithInviteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isAuthConfigured()) return { message: AUTH_UNAVAILABLE };
  const token = inviteToken(formData);
  if (!token) return { message: INVITE_REQUIRED };
  const personName = requireName(text(formData, "name"));
  if (!personName.ok) return { message: personName.message };
  const email = normalizeEmail(text(formData, "email"));
  if (!email || !email.includes("@")) {
    return { message: "Informe um e-mail válido." };
  }
  const password = text(formData, "password");
  const passwordProblem = passwordError(password);
  if (passwordProblem) return { message: passwordProblem };

  let userId: string | null = null;
  try {
    const created = await getAuth().api.signUpEmail({
      body: {
        name: personName.name,
        email,
        password,
      },
      headers: await headers(),
    });
    userId = created.user.id;
    const accepted = await acceptAfterAuth(userId, token);
    if (accepted) {
      try {
        await deleteOrphanUser(userId);
      } catch {
        console.error("Falha ao desfazer cadastro de convite incompleto.");
      }
      return accepted;
    }
  } catch (error) {
    if (userId) {
      try {
        await deleteOrphanUser(userId);
      } catch {
        console.error("Falha ao desfazer cadastro de convite incompleto.");
      }
    }
    if (error instanceof InviteError) {
      return { message: error.message };
    }
    if (error instanceof APIError) {
      return { message: GENERIC_SIGN_UP };
    }
    console.error("Falha no cadastro com convite.");
    return { message: GENERIC_SIGN_UP };
  }
  redirect("/");
}
