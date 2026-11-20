"use client";

import { useState } from "react";
import { whatsappUrlForPhone } from "@/lib/format/whatsapp";

export function PixCharge({
  payload,
  message,
  phone,
}: {
  payload: string;
  message: string;
  phone: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const whatsapp = whatsappUrlForPhone(phone, message);

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="break-all rounded-none border border-line bg-paper-soft p-3 text-xs dark:border-line-dark dark:bg-ink-soft">
        {payload}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex min-h-11 items-center border border-ink px-4 text-base text-ink transition-colors duration-300 dark:border-paper dark:text-paper"
        >
          {copied ? "Copiado." : "Copiar Pix"}
        </button>
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center bg-accent px-4 text-base text-ink-soft hover:bg-accent-dark"
        >
          Enviar no WhatsApp
        </a>
      </div>
    </div>
  );
}
