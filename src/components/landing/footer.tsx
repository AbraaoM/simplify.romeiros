import Link from "next/link";
import {
  CONTACT_EMAIL,
  CONTACT_WHATSAPP_URL,
  NAME,
} from "@/lib/brand";

export function LandingFooter() {
  return (
    <footer className="border-t border-line dark:border-line-dark">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p className="font-display text-xl leading-none">{NAME}</p>
        <nav className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6" aria-label="Rodapé">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex min-h-11 items-center text-sm text-muted dark:text-faint"
          >
            {CONTACT_EMAIL}
          </a>
          <a
            href={CONTACT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-sm text-muted dark:text-faint"
          >
            WhatsApp
          </a>
          <Link
            href="/privacidade"
            className="inline-flex min-h-11 items-center text-sm text-muted dark:text-faint"
          >
            Privacidade
          </Link>
          <Link
            href="/termos"
            className="inline-flex min-h-11 items-center text-sm text-muted dark:text-faint"
          >
            Termos
          </Link>
        </nav>
      </div>
    </footer>
  );
}
