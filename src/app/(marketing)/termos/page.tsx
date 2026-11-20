/**
 * RASCUNHO PARA REVISÃO JURÍDICA.
 * Este texto descreve regras simples de uso do produto. Não é parecer
 * jurídico e não substitui a revisão por advogado habilitado antes de
 * uso comercial amplo.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, NAME, trialLabel } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Termos — ${NAME}`,
  description: `Termos de uso do ${NAME} para agências de turismo e romaria.`,
  alternates: {
    canonical: "/termos",
  },
};

export default function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-[720px] px-5 py-16 lg:px-8 lg:py-24">
      <h1 className="font-display text-5xl leading-[1.1] sm:text-6xl">
        Termos de uso
      </h1>
      <p className="mt-6 text-sm text-muted dark:text-faint">
        Este texto é um rascunho e será revisado.
      </p>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-3xl leading-none">O serviço</h2>
        <p>
          O {NAME} é uma ferramenta para agências organizarem excursões e
          romarias: passageiros, poltronas, parcelas e listas. O cadastro
          começa com {trialLabel().toLowerCase()}.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-3xl leading-none">
          Responsabilidade da agência
        </h2>
        <p>
          A agência é a controladora dos dados dos passageiros. Cabe a ela
          coletar só o necessário, informar os titulares e ter base legal
          para o tratamento. O {NAME} opera o sistema a pedido da agência.
        </p>
        <p>
          O dinheiro das parcelas vai para a conta da própria agência. O{" "}
          {NAME} não recebe, não guarda e não transfere esse valor.
        </p>
        <p>
          As listas geradas ajudam a organizar a viagem. Elas não substituem
          licenciamento, seguro ou qualquer obrigação da ANTT ou de outros
          órgãos.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-3xl leading-none">Uso aceitável</h2>
        <p>
          A conta é da agência. O dono pode convidar funcionários. Cada
          pessoa deve proteger a própria senha. É vedado usar o serviço para
          tratar dados sem autorização, tentar acessar outra agência ou
          sobrecarregar a plataforma.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-3xl leading-none">Contato</h2>
        <p>
          Dúvidas:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. A{" "}
          <Link href="/privacidade" className="underline">
            política de privacidade
          </Link>{" "}
          descreve o tratamento de dados pessoais.
        </p>
      </section>
    </article>
  );
}
