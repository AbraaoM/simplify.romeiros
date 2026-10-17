"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h1 className="max-w-md font-display text-5xl leading-[0.9]">
        Não foi possível abrir esta página.
      </h1>
      <p className="mt-4 text-muted dark:text-faint">Tente de novo em instantes.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-8 inline-flex min-h-11 items-center bg-accent px-4 text-ink-soft transition-colors duration-300 hover:bg-accent-dark"
      >
        Tentar de novo
      </button>
    </div>
  );
}
