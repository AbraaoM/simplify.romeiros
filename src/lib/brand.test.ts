import { expect, test } from "vitest";
import {
  CONTACT_EMAIL,
  CONTACT_WHATSAPP_E164,
  CONTACT_WHATSAPP_MESSAGE,
  CONTACT_WHATSAPP_PRICING_URL,
  CONTACT_WHATSAPP_URL,
  DOMAIN,
  NAME,
  PRICING,
  SHOW_PRICING,
  SITE_URL,
  planPriceLabel,
  siteUrl,
  trialCtaLabel,
  trialLabel,
  whatsappUrl,
} from "./brand";

test("expõe o nome, o host canônico e os contatos públicos", () => {
  expect(NAME).toBe("Caravaneiro");
  expect(DOMAIN).toBe("caravaneiro.abraaomoreira.dev");
  expect(SITE_URL).toBe("https://caravaneiro.abraaomoreira.dev");
  expect(siteUrl("/landing")).toBe(
    "https://caravaneiro.abraaomoreira.dev/landing",
  );
  expect(CONTACT_EMAIL).toBe("contato@abraaomoreira.dev");
  expect(CONTACT_WHATSAPP_E164).toBe("5512981660131");
});

test("monta o WhatsApp com mensagem pronta usando o nome e o teste grátis", () => {
  expect(CONTACT_WHATSAPP_MESSAGE).toContain(NAME);
  expect(CONTACT_WHATSAPP_MESSAGE).toContain(`${PRICING.trialDays} dias grátis`);
  expect(CONTACT_WHATSAPP_URL).toBe(whatsappUrl(CONTACT_WHATSAPP_MESSAGE));
  expect(CONTACT_WHATSAPP_URL.startsWith("https://wa.me/5512981660131?text=")).toBe(
    true,
  );
  expect(CONTACT_WHATSAPP_URL).toContain(encodeURIComponent(CONTACT_WHATSAPP_MESSAGE));
  expect(CONTACT_WHATSAPP_PRICING_URL.startsWith("https://wa.me/5512981660131?text=")).toBe(
    true,
  );
});

test("guarda os planos sugeridos no código e não os expõe enquanto SHOW_PRICING for false", () => {
  expect(SHOW_PRICING).toBe(false);
  expect(PRICING.trialDays).toBe(14);
  expect(PRICING.requiresCard).toBe(false);
  expect(PRICING.plans).toHaveLength(2);
  expect(PRICING.plans[0]).toMatchObject({
    id: "starter",
    monthlyCents: 7900,
    maxActiveExcursions: 3,
  });
  expect(PRICING.plans[1]).toMatchObject({
    id: "unlimited",
    monthlyCents: 14900,
    maxActiveExcursions: null,
  });
  expect(PRICING.plans[0].description.length).toBeGreaterThan(0);
  expect(PRICING.plans[1].description.length).toBeGreaterThan(0);
  expect(trialLabel()).toBe("14 dias grátis, sem cartão");
  expect(trialCtaLabel()).toBe("Quero testar 14 dias grátis");
  for (const plan of PRICING.plans) {
    expect(planPriceLabel(plan)).toBe("Consulte");
    expect(planPriceLabel(plan)).not.toContain("R$");
  }
});
