import Link from "next/link";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { NAME } from "@/lib/brand";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-line pt-[env(safe-area-inset-top)] dark:border-line-dark">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <Link href="/landing" className="font-display text-2xl leading-none">
            {NAME}
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <h1 className="font-display text-5xl leading-[1.1]">{title}</h1>
        <p className="mt-4 text-muted dark:text-faint">{description}</p>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
