import {
  CONTACT_WHATSAPP_PRICING_URL,
  CONTACT_WHATSAPP_URL,
} from "@/lib/brand";

type WhatsappCtaProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "text";
  href?: string;
  purpose?: "trial" | "pricing";
};

const base =
  "inline-flex min-h-11 items-center justify-center px-4 text-center transition-colors duration-300";

const variants = {
  primary:
    "bg-accent text-ink-soft hover:bg-accent-dark",
  secondary:
    "border border-ink text-ink hover:bg-paper-soft dark:border-paper dark:text-paper dark:hover:bg-ink-soft",
  text: "px-1 text-ink underline decoration-accent underline-offset-4 dark:text-paper",
} as const;

export function WhatsappCta({
  children,
  variant = "primary",
  href,
  purpose = "trial",
}: WhatsappCtaProps) {
  const target =
    href ??
    (purpose === "pricing" ? CONTACT_WHATSAPP_PRICING_URL : CONTACT_WHATSAPP_URL);

  return (
    <a
      href={target}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${variants[variant]}`}
    >
      {children}
    </a>
  );
}
