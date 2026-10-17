export function ErrorState({ message }: { message: string }) {
  return (
    <div>
      <h1 className="font-display text-5xl leading-[0.9]">{message}</h1>
      <p className="mt-4 max-w-md text-muted dark:text-faint">
        Tente de novo em instantes.
      </p>
    </div>
  );
}
