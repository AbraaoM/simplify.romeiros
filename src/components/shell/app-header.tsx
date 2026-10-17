"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader({
  attentionCount,
  agencyName,
  agencyHref,
}: {
  attentionCount: number | null;
  agencyName: string | null;
  agencyHref: string | null;
}) {
  const pathname = usePathname();

  return (
    <header className="border-b border-line pt-[env(safe-area-inset-top)] dark:border-line-dark">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div>
          <Link href="/" className="font-display text-2xl leading-none">
            Simplify
          </Link>
          {agencyHref ? (
            <Link
              href={agencyHref}
              className="mt-1 inline-flex min-h-11 items-center text-sm text-muted dark:text-faint"
            >
              {agencyName ?? "Agência"}
            </Link>
          ) : agencyName ? (
            <p className="mt-1 text-sm text-muted dark:text-faint">{agencyName}</p>
          ) : null}
        </div>
        <nav className="flex items-center gap-5" aria-label="Principal">
          <NavLink href="/" current={pathname === "/"}>
            Início
          </NavLink>
          <NavLink href="/pendencias" current={pathname.startsWith("/pendencias")}>
            Pendências
            {attentionCount ? (
              <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center bg-accent px-1 text-sm text-ink-soft">
                {attentionCount}
              </span>
            ) : null}
          </NavLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`inline-flex min-h-11 items-center text-sm ${
        current
          ? "border-b-2 border-ink text-ink dark:border-paper dark:text-paper"
          : "text-muted dark:text-faint"
      }`}
    >
      {children}
    </Link>
  );
}
