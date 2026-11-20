export const NAME = "Caravaneiro";

/** Host canônico provisório. Domínio próprio ainda não registrado. */
export const DOMAIN = "caravaneiro.abraaomoreira.dev";

export const SITE_URL = `https://${DOMAIN}`;

export const CONTACT_EMAIL = "contato@abraaomoreira.dev";

export const CONTACT_WHATSAPP_E164 = "5512981660131";

export const PRICING = {
  trialDays: 14,
  requiresCard: false,
  plans: [
    {
      id: "starter",
      name: "Até 3 excursões ativas",
      description: "Para quem tem poucas saídas em andamento ao mesmo tempo.",
      monthlyCents: 7900,
      maxActiveExcursions: 3,
    },
    {
      id: "unlimited",
      name: "Ilimitado",
      description: "Para quem mantém várias excursões abertas.",
      monthlyCents: 14900,
      maxActiveExcursions: null,
    },
  ],
} as const;

export type PricingPlan = (typeof PRICING.plans)[number];

/**
 * Preços sugeridos aguardam ok do dono. Enquanto for false, a landing
 * não mostra valores — só "Consulte" e o período de teste.
 */
export const SHOW_PRICING = false;

export const CONTACT_WHATSAPP_MESSAGE = `Olá! Quero testar o ${NAME} por ${PRICING.trialDays} dias grátis e conhecer o sistema para a minha agência.`;

export const CONTACT_WHATSAPP_URL = whatsappUrl(CONTACT_WHATSAPP_MESSAGE);

export const CONTACT_WHATSAPP_PRICING_MESSAGE = `Olá! Quero consultar os planos do ${NAME} para a minha agência.`;

export const CONTACT_WHATSAPP_PRICING_URL = whatsappUrl(
  CONTACT_WHATSAPP_PRICING_MESSAGE,
);

export function whatsappUrl(message: string): string {
  return `https://wa.me/${CONTACT_WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}

export function siteUrl(path = "/"): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return suffix === "/" ? `${SITE_URL}/` : `${SITE_URL}${suffix}`;
}

export function trialLabel(): string {
  return `${PRICING.trialDays} dias grátis, sem cartão`;
}

export function trialCtaLabel(): string {
  return `Quero testar ${PRICING.trialDays} dias grátis`;
}

export function planPriceLabel(plan: PricingPlan): string {
  if (!SHOW_PRICING) return "Consulte";
  const monthly = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(plan.monthlyCents / 100);
  return `${monthly}/mês`;
}
