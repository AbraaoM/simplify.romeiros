import Link from "next/link";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { NAME, trialCtaLabel } from "@/lib/brand";

export function LandingHeader() {
  return (
    <header className="border-b border-line pt-[env(safe-area-inset-top)] dark:border-line-dark">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-5 focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:text-ink-soft"
      >
        Ir para o conteúdo
      </a>
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-3 px-5 py-3 lg:px-8">
        <Link
          href="/landing"
          className="font-display text-2xl leading-none"
        >
          {NAME}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Principal">
          <a
            href="#como-funciona"
            className="hidden min-h-11 items-center text-sm text-muted sm:inline-flex dark:text-faint"
          >
            Como funciona
          </a>
          <a
            href="#planos"
            className="hidden min-h-11 items-center text-sm text-muted sm:inline-flex dark:text-faint"
          >
            Planos
          </a>
          <Link
            href="/entrar"
            className="inline-flex min-h-11 items-center text-sm text-muted dark:text-faint"
          >
            Entrar
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center bg-accent px-3 text-sm text-ink-soft sm:px-4"
          >
            <span className="sm:hidden">Testar</span>
            <span className="hidden sm:inline">{trialCtaLabel()}</span>
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
