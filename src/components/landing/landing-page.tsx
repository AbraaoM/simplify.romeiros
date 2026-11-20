import {
  NAME,
  PRICING,
  planPriceLabel,
  trialCtaLabel,
  trialLabel,
} from "@/lib/brand";
import { SeatPreview } from "./seat-preview";
import { WhatsappCta } from "./whatsapp-cta";

const pains = [
  "Caderno que só uma pessoa entende.",
  "Planilha que quebra no celular.",
  "Conversa de WhatsApp virando controle de vaga.",
  "A mesma poltrona vendida duas vezes.",
  "No dia da saída, ninguém sabe ao certo quem pagou.",
];

const steps = [
  {
    title: "Monte a excursão",
    text: "Cadastre destino, datas, o ônibus, os pontos de embarque e o plano de parcelas.",
  },
  {
    title: "Coloque cada passageiro no lugar",
    text: "Assinale a poltrona, importe a planilha e acompanhe o que já entrou — Pix, dinheiro, cartão ou outro.",
  },
  {
    title: "Embarque com a lista pronta",
    text: "Exporte a lista de embarque e a lista de quartos em PDF e avise o grupo pelo WhatsApp, com a mensagem pronta.",
  },
];

const features = [
  {
    title: "Mapa de poltronas sem dupla reserva",
    text: "Veja o ônibus em layout 2×2, 2×1 ou leito, bloqueie e troque lugares. O sistema impede que a mesma poltrona seja vendida duas vezes.",
  },
  {
    title: "Parcelas e controle de pagamento",
    text: "Plano por passageiro, marcar pago, atraso e saldo. O Pix é copia-e-cola com a chave da própria agência — o dinheiro não passa pela plataforma.",
  },
  {
    title: "Lista de embarque e lista de quartos em PDF",
    text: "Nome, documento, poltrona e ponto de embarque na lista de saída; quartos organizados à parte. Também dá para exportar em CSV e imprimir.",
  },
  {
    title: "Lembrete e aviso pelo WhatsApp",
    text: "Um botão abre o WhatsApp com a mensagem pronta: lembrete de parcela, aviso de embarque ou o grupo da viagem. Na primeira versão não há envio em massa automático.",
  },
  {
    title: "Painel do dia",
    text: "No começo do dia, veja atrasados, parcelas que vencem, poltronas livres e as saídas mais próximas.",
  },
  {
    title: "Passageiros com planilha CSV",
    text: "Cadastro com nome, documento, nascimento, contato, responsável (quando for menor), ponto de embarque e observações. Dá para importar a planilha em CSV.",
  },
];

const faqs = [
  {
    question: `${NAME} substitui a ANTT?`,
    answer:
      "Não. A lista exportada ajuda no controle e no embarque, mas o sistema não substitui licença, autorização nem fiscalização.",
  },
  {
    question: "Funciona no celular?",
    answer:
      "Sim. As telas foram feitas primeiro para o telefone, e também funcionam no computador do escritório.",
  },
  {
    question: "Funciona sem internet?",
    answer:
      "Não. É preciso estar online para usar o sistema.",
  },
  {
    question: "Preciso de cartão para testar?",
    answer: `Não. São ${PRICING.trialDays} dias grátis, sem cartão.`,
  },
  {
    question: `O pagamento do passageiro passa pelo ${NAME}?`,
    answer:
      "Não. O valor vai direto para a conta da agência. A plataforma não recebe, não retém e não repassa esse dinheiro.",
  },
  {
    question: "Posso importar a planilha que eu já uso?",
    answer:
      "Sim. A primeira versão importa passageiros por planilha CSV.",
  },
];

export function LandingPage() {
  return (
    <>
      <Hero />
      <Pain />
      <HowItWorks />
      <Features />
      <Trust />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
  tone = "default",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  tone?: "default" | "soft";
}) {
  return (
    <section
      id={id}
      className={
        tone === "soft"
          ? "bg-paper-soft dark:bg-ink-soft"
          : "bg-paper dark:bg-ink"
      }
    >
      <div className="mx-auto w-full max-w-[1120px] px-5 py-16 lg:px-8 lg:py-24">
        {eyebrow ? (
          <p className="text-sm text-muted dark:text-faint">{eyebrow}</p>
        ) : null}
        <h2 className="max-w-3xl font-display text-4xl leading-[0.95] sm:text-5xl">
          {title}
        </h2>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

function Hero() {
  return (
    <section className="bg-paper dark:bg-ink">
      <div className="mx-auto w-full max-w-[1120px] px-5 py-16 lg:px-8 lg:py-28">
        <p className="text-sm text-muted dark:text-faint">{NAME}</p>
        <h1 className="mt-4 max-w-4xl font-display text-4xl leading-[0.95] sm:text-6xl lg:text-7xl">
          Parcelas, poltronas e quartos da excursão num lugar só, sem caderno e
          sem planilha.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted dark:text-faint">
          Feito para agências e organizadores de romarias e excursões. Veja quem
          senta onde, o que já foi pago e a lista de embarque — no celular ou no
          computador.
        </p>
        <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <WhatsappCta>{trialCtaLabel()}</WhatsappCta>
          <p className="text-sm text-muted dark:text-faint">{trialLabel()}.</p>
        </div>
      </div>
    </section>
  );
}

function Pain() {
  return (
    <Section id="dor" eyebrow="A dor" title="O controle da viagem não deveria viver em três lugares." tone="soft">
      <ul className="grid gap-4 sm:grid-cols-2">
        {pains.map((item) => (
          <li
            key={item}
            className="border-l-2 border-accent pl-4 text-lg"
          >
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function HowItWorks() {
  return (
    <Section id="como-funciona" title="Como funciona">
      <ol className="grid gap-8 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title}>
            <p className="font-display text-4xl text-accent">{index + 1}</p>
            <h3 className="mt-4 font-display text-2xl leading-tight">{step.title}</h3>
            <p className="mt-3 text-muted dark:text-faint">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Features() {
  return (
    <Section
      id="recursos"
      eyebrow="Versão em lançamento: estamos liberando por etapas, com quem testar junto"
      title="O que a primeira versão entrega no dia a dia."
      tone="soft"
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start">
        <div className="lg:col-start-2 lg:row-start-1">
          <SeatPreview />
        </div>
        <ul className="grid gap-8 sm:grid-cols-2 lg:col-start-1 lg:row-start-1">
          {features.map((feature) => (
            <li key={feature.title}>
              <h3 className="font-display text-2xl leading-tight">{feature.title}</h3>
              <p className="mt-3 text-muted dark:text-faint">{feature.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function Trust() {
  return (
    <Section id="dados" title="Seus dados e seu dinheiro">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <h3 className="font-display text-2xl leading-tight">
            O dinheiro vai direto para a conta da agência
          </h3>
          <p className="mt-3 text-muted dark:text-faint">
            O valor pago pelo passageiro nunca passa pela plataforma. O Pix
            copia-e-cola usa a chave Pix que a própria agência cadastra. Não há
            cobrança automática nesta versão.
          </p>
        </div>
        <div>
          <h3 className="font-display text-2xl leading-tight">LGPD, no essencial</h3>
          <p className="mt-3 text-muted dark:text-faint">
            Coleta mínima: só o necessário para organizar a viagem. Dá para
            exportar e excluir os dados do passageiro. Dados de menores entram
            só com um responsável.
          </p>
        </div>
      </div>
    </Section>
  );
}

function Pricing() {
  // Preço: pendente de aprovação do dono. SHOW_PRICING=false; os valores
  // mensais ficam só em src/lib/brand.ts e não aparecem nesta página.
  return (
    <Section
      id="planos"
      eyebrow="Planos"
      title={capitalize(trialLabel()) + "."}
      tone="soft"
    >
      <p className="max-w-2xl text-lg text-muted dark:text-faint">
        Teste o {NAME} com a sua agência, sem informar cartão. Depois, fale
        conosco para escolher o plano.
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {PRICING.plans.map((plan) => (
          <li
            key={plan.id}
            className="flex flex-col border border-line p-6 dark:border-line-dark"
          >
            <h3 className="font-display text-3xl leading-tight">{plan.name}</h3>
            <p className="mt-3 flex-1 text-muted dark:text-faint">{plan.description}</p>
            <div className="mt-8">
              <WhatsappCta purpose="pricing" variant="secondary">
                {planPriceLabel(plan)}
              </WhatsappCta>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Faq() {
  return (
    <Section id="faq" title="Perguntas frequentes">
      <div className="divide-y divide-line dark:divide-line-dark">
        {faqs.map((item) => (
          <details key={item.question} className="group py-2">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium">
              <span>{item.question}</span>
              <span aria-hidden="true" className="text-accent">
                +
              </span>
            </summary>
            <p className="pb-4 text-muted dark:text-faint">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function FinalCta() {
  return (
    <section className="bg-ink text-paper dark:bg-paper dark:text-ink">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col items-start gap-8 px-5 py-16 lg:px-8 lg:py-24">
        <h2 className="max-w-3xl font-display text-4xl leading-[0.95] sm:text-6xl">
          Comece pelos {PRICING.trialDays} dias grátis.
        </h2>
        <p className="max-w-xl text-lg text-faint dark:text-muted">
          Fale pelo WhatsApp para começar o teste com a sua agência —{" "}
          {trialLabel()}.
        </p>
        <WhatsappCta>{trialCtaLabel()}</WhatsappCta>
      </div>
    </section>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
