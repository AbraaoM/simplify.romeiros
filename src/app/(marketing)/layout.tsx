import type { Metadata } from "next";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHeader } from "@/components/landing/header";
import { SITE_URL } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  robots: {
    index: false,
    follow: false,
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <LandingHeader />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
