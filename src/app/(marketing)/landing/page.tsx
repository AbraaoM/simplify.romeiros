import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { NAME, trialLabel } from "@/lib/brand";

const title = `${NAME} — parcelas, poltronas e quartos da excursão num lugar só`;
const description = `Sistema para agências e organizadores de romarias e excursões: mapa de poltronas, parcelas, lista de embarque e quartos num lugar só. ${trialLabel()}.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/landing",
  },
  openGraph: {
    title,
    description,
    url: "/landing",
    siteName: NAME,
    locale: "pt_BR",
    type: "website",
  },
};

export default function LandingRoute() {
  return <LandingPage />;
}
