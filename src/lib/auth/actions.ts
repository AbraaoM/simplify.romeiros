"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { getAuth, isAuthConfigured } from "@/lib/auth/server";
import { deleteOrphanUser, provisionOwnerAgency } from "@/lib/auth/provision";
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
