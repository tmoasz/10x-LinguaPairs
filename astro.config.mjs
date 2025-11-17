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
      OPENROUTER_API_KEY: envField.string({
        access: "secret",
        context: "server",
      }),
      OPENROUTER_BASE_URL: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      OPENROUTER_DEFAULT_MODEL: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      OPENROUTER_PAIR_MODEL: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      OPENROUTER_PAIR_FALLBACK_MODEL: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      OPENROUTER_TIMEOUT_MS: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      OPENROUTER_APP_TITLE: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
      OPENROUTER_SITE_URL: envField.string({
        access: "secret",
        context: "server",
        optional: true,
      }),
    },
  },
  server: { port: 3000 },
  // @ts-expect-error - preview is not a valid property for the server config
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
  // Enable verbose logging in development
  logLevel: process.env.NODE_ENV === "production" ? "error" : "debug",
});
