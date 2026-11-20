import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";
import { peekAuthenticatedSubject } from "@/lib/auth/session";
import { NAME, trialLabel } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Criar conta — ${NAME}`,
};

export default async function SignUpPage() {
  if (await peekAuthenticatedSubject()) {
    redirect("/");
  }
  return (
    <AuthShell
      title="Criar conta"
      description={`Cadastre sua agência e comece com ${trialLabel().toLowerCase()}.`}
    >
      <SignUpForm />
    </AuthShell>
  );
}
