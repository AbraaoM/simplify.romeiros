import type { Metadata } from "next";
import {
  CONTACT_EMAIL,
  CONTACT_WHATSAPP_URL,
  NAME,
} from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacidade — ${NAME}`,
  description: `A política de privacidade do ${NAME} está sendo finalizada.`,
  alternates: {
    canonical: "/privacidade",
  },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-[720px] px-5 py-16 lg:px-8 lg:py-24">
      <h1 className="font-display text-5xl leading-[1.1] sm:text-6xl">
        Privacidade
      </h1>
      <p className="mt-8 text-lg">
        A política de privacidade do {NAME} está sendo finalizada.
      </p>
      <p className="mt-4 text-muted dark:text-faint">
        Enquanto o texto não é publicado, fale conosco para qualquer dúvida
        sobre dados pessoais.
      </p>
      <div className="mt-10 flex flex-col items-start gap-3">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex min-h-11 items-center"
        >
          {CONTACT_EMAIL}
        </a>
        <a
          href={CONTACT_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center"
        >
          WhatsApp
        </a>
      </div>
    </article>
  );
}
