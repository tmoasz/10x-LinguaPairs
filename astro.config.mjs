// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";
import process from "node:process";

const envName = process.env.PUBLIC_ENV_NAME ?? "local";
const useCloudflareAdapter = envName === "production";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  env: {
    schema: {
      PUBLIC_ENV_NAME: envField.string({
        access: "secret",
        context: "server",
      }),
      SUPABASE_URL: envField.string({
        access: "secret",
        context: "server",
      }),
      SUPABASE_KEY: envField.string({
        access: "secret",
        context: "server",
      }),
    },
  },
  server: { port: 3000 },
  preview: { port: 4321, host: false }, // Use localhost only for Playwright
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
  },
  adapter: useCloudflareAdapter
    ? cloudflare()
    : node({
        mode: "standalone",
      }),
});
