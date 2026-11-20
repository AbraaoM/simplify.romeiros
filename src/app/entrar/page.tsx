import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";
import { peekAuthenticatedSubject } from "@/lib/auth/session";
import { NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Entrar — ${NAME}`,
};

export default async function SignInPage() {
  if (await peekAuthenticatedSubject()) {
    redirect("/");
  }
  return (
    <AuthShell
      title="Entrar"
      description="Use o e-mail e a senha da sua agência para abrir o painel."
    >
      <SignInForm />
    </AuthShell>
  );
}
