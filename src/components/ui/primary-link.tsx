import Link from "next/link";

export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center bg-accent px-4 text-ink-soft transition-colors duration-300 hover:bg-accent-dark"
    >
      {children}
    </Link>
  );
}
