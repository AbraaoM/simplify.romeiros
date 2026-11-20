import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  AcceptInviteForm,
  SignInWithInviteForm,
  SignUpWithInviteForm,
} from "@/components/auth/invite-forms";
import { peekAuthenticatedSubject } from "@/lib/auth/session";
import { NAME } from "@/lib/brand";
import { INVITE_EXPIRED, INVITE_INVALID } from "@/lib/domain/invites";
import { peekInvitePreview } from "@/lib/repositories/invites";
import { resolveTenantContext } from "@/lib/security/context";
import { isSecurityError } from "@/lib/security/errors";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Convite — ${NAME}`,
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await peekInvitePreview(token);

  if (!preview.ok) {
    const message =
      preview.reason === "expired"
        ? INVITE_EXPIRED
        : preview.reason === "used"
          ? INVITE_INVALID
          : INVITE_INVALID;
    return (
      <AuthShell title="Convite" description={message}>
        <p className="text-sm text-muted dark:text-faint">
          Peça um novo convite ao dono da agência.
        </p>
      </AuthShell>
    );
  }

  const subject = await peekAuthenticatedSubject();
  let alreadyMember = false;
  if (subject) {
    try {
      await resolveTenantContext();
      alreadyMember = true;
    } catch (error) {
      alreadyMember = !(
        isSecurityError(error) && error.code === "no_membership"
      );
    }
  }

  if (alreadyMember) {
    return (
      <AuthShell
        title="Convite"
        description="Esta conta já está vinculada a uma agência."
      >
        <p className="text-sm text-muted dark:text-faint">
          Um usuário só pode ter um vínculo ativo neste momento.
        </p>
      </AuthShell>
    );
  }

  const description = `Você foi convidado para a agência ${preview.agencyName}.`;

  if (subject) {
    return (
      <AuthShell title="Convite" description={description}>
        <AcceptInviteForm token={token} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Convite" description={description}>
      <div className="space-y-10">
        <section>
          <h2 className="font-display text-3xl leading-none">Já tenho conta</h2>
          <div className="mt-6">
            <SignInWithInviteForm token={token} />
          </div>
        </section>
        <section>
          <h2 className="font-display text-3xl leading-none">Criar conta</h2>
          <p className="mt-3 text-sm text-muted dark:text-faint">
            Você entra como funcionário desta agência. Não criamos uma agência
            nova.
          </p>
          <div className="mt-6">
            <SignUpWithInviteForm token={token} />
          </div>
        </section>
      </div>
    </AuthShell>
  );
}
