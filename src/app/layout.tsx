import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import { AppHeader } from "@/components/shell/app-header";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { ExampleBanner } from "@/components/ui/example-banner";
import { todayInBrazil } from "@/lib/domain/dates";
import { loadAgencyData } from "@/lib/db/source";
import { projectDueAttention } from "@/lib/services/views";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Simplify",
  description: "Parcelas, poltronas e quartos da excursão num lugar só.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const today = todayInBrazil();
  const loaded = await loadAgencyData(today);
  const attentionCount = loaded.ok
    ? projectDueAttention(loaded.data, today).length
    : null;
  const agencyName = loaded.ok ? (loaded.data.agency?.name ?? null) : null;

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${anton.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full bg-paper font-sans text-ink antialiased transition-colors duration-300 dark:bg-ink dark:text-paper">
        <ThemeProvider>
          <AppHeader
            attentionCount={attentionCount}
            agencyName={agencyName}
            agencyHref={loaded.ok && loaded.source === "database" ? "/agencia" : null}
          />
          {loaded.ok && loaded.source === "example" ? <ExampleBanner /> : null}
          <main className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-16 lg:px-8">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
