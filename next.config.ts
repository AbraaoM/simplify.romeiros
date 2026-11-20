import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The panel reads "today" and the database on each visit.
  // Cache Components stay off until a later pass designs the static shell.
  cacheComponents: false,
  partialPrefetching: false,
  // No subdomínio público do produto, a raiz mostra a landing só para visitante
  // sem sessão; quem está logado vê o painel (que mora em "/").
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "caravaneiro.abraaomoreira.dev" }],
          missing: [
            { type: "cookie", key: "better-auth.session_token" },
            { type: "cookie", key: "__Secure-better-auth.session_token" },
          ],
          destination: "/landing",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
