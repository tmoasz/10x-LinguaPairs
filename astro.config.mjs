// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  preview: { port: 4321, host: false }, // Use localhost only for Playwright
  vite: {
    plugins: [tailwindcss()],
  },
  adapter:
    import.meta.env.NODE_ENV === "production"
      ? cloudflare()
      : node({
          mode: "standalone",
        }),
});
