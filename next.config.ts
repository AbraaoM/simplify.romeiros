import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The panel reads "today" and the database on each visit.
  // Cache Components stay off until a later pass designs the static shell.
  cacheComponents: false,
  partialPrefetching: false,
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
