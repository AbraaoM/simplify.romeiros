import { PrimaryLink } from "@/components/ui/primary-link";

export default function ExcursionNotFound() {
  return (
    <div>
      <h1 className="max-w-md font-display text-5xl leading-[1.1]">
        Essa excursão não está na lista.
      </h1>
      <div className="mt-8">
        <PrimaryLink href="/">Voltar ao início</PrimaryLink>
      </div>
    </div>
  );
}
