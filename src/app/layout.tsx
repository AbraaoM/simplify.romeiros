import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { NAME } from "@/lib/brand";
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
  title: NAME,
  description: "Parcelas, poltronas e quartos da excursão num lugar só.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${anton.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full bg-paper font-sans text-ink antialiased transition-colors duration-300 dark:bg-ink dark:text-paper">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
