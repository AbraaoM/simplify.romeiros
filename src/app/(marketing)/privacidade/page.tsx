/**
 * RASCUNHO PARA REVISÃO JURÍDICA.
 * Este texto descreve o funcionamento técnico do produto e a divisão
 * entre controladora e operador. Não é parecer jurídico e não substitui
 * a revisão por advogado habilitado antes de uso comercial amplo.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacidade — ${NAME}`,
  description: `Como o ${NAME} trata dados pessoais de agências e passageiros.`,
  alternates: {
    canonical: "/privacidade",
  },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-[720px] px-5 py-16 lg:px-8 lg:py-24">
      <h1 className="font-display text-5xl leading-[1.1] sm:text-6xl">
        Privacidade
      </h1>
      <p className="mt-6 text-sm text-muted dark:text-faint">
        Este texto é um rascunho e será revisado.
      </p>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-3xl leading-none">
          Quem controla e quem opera
        </h2>
        <p>
          A agência de turismo ou de romaria que usa o {NAME} é a{" "}
          <strong>controladora</strong> dos dados dos seus passageiros. Ela
          decide por que e como esses dados entram no sistema, e responde
          perante os titulares.
        </p>
        <p>
          O {NAME} atua como <strong>operador</strong>: trata os dados só para
          prestar o serviço contratado pela agência, segundo as instruções
          dela, e não usa cadastro de passageiro para marketing próprio.
        </p>
        <p>
          Os dados da conta da própria agência (quem entra no painel) são
          tratados pelo {NAME} para criar e manter o acesso ao serviço.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-3xl leading-none">
          Dados que coletamos
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Conta de acesso: nome, e-mail e senha (a senha é guardada só como
            hash).
          </li>
          <li>
            Agência: nome, telefone, cidade e, se cadastrada, a chave Pix da
            própria agência.
          </li>
          <li>
            Passageiros, no mínimo necessário para a operação da excursão:
            nome, documento (em geral CPF), órgão emissor, telefone, e-mail,
            ponto de embarque, poltrona, quarto e parcelas.
          </li>
          <li>
            Registro de ações sensíveis (exportar dados, anonimizar, importar
            CSV, gerar lista ANTT, marcar parcela paga), sem gravar nome, CPF,
            telefone ou e-mail no histórico.
          </li>
          <li>
            Cookie de sessão HttpOnly, necessário para manter o login.
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-3xl leading-none">Finalidade</h2>
        <p>
          Organizar excursões e romarias: controlar passageiros, poltronas,
          parcelas e listas. A chave Pix serve só para a agência gerar o Pix
          copia e cola; o valor vai direto para a conta da agência. O {NAME}{" "}
          não intermedia pagamento e não substitui o licenciamento da ANTT.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-3xl leading-none">Retenção</h2>
        <p>
          Os dados permanecem enquanto a agência mantiver a conta e precisar
          deles para a operação e para o histórico de parcelas. A controladora
          pode exportar os dados de um passageiro ou anonimizar nome, CPF e
          telefone, preservando os valores das parcelas. Contas inativas podem
          ser removidas ou anonimizadas em momento posterior, ainda a
          definir com a revisão jurídica.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-3xl leading-none">
          Direitos do titular
        </h2>
        <p>
          O titular pode pedir confirmação de tratamento, acesso, correção,
          anonimização ou exclusão, portabilidade e informação sobre com quem
          os dados são compartilhados. Pedidos sobre dados de passageiros
          devem ser feitos primeiro à agência (controladora). O encarregado
          pelo {NAME} também pode ser acionado no contato abaixo.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-3xl leading-none">
          Compartilhamento e infraestrutura
        </h2>
        <p>
          Não vendemos dados pessoais. Para hospedar o serviço usamos
          provedores de nuvem (hoje Vercel e Neon) como suboperadores
          técnicos. Listas de passageiros só são geradas a pedido da agência,
          por exemplo para o transportador ou para a ANTT.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-3xl leading-none">
          Encarregado e contato
        </h2>
        <p>
          Encarregado pelo tratamento no {NAME}:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <p className="mt-12">
        <Link href="/termos" className="inline-flex min-h-11 items-center underline">
          Termos de uso
        </Link>
      </p>
    </article>
  );
}
