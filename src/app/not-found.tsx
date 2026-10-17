import { PrimaryLink } from "@/components/ui/primary-link";

export default function NotFound() {
  return (
    <div>
      <h1 className="max-w-md font-display text-5xl leading-[0.9]">
        Essa página não existe.
      </h1>
      <div className="mt-8">
        <PrimaryLink href="/">Voltar ao início</PrimaryLink>
      </div>
    </div>
  );
}
