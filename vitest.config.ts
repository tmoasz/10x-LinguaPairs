import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom environment for DOM testing
    environment: "jsdom",

    // Global test utilities (like vi, expect) available without imports
    globals: true,

    // Setup files to run before each test file
    setupFiles: ["./test/setup.ts"],

    // Include patterns for test files
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],

    // Exclude patterns
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/.{idea,git,cache,output,temp}/**"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/e2e/**",
        "**/*.config.*",
        "**/test/**",
        "**/*.d.ts",
        "**/types.ts",
        "**/db/database.types.ts",
      ],
      // Optional: Set coverage thresholds
      // thresholds: {
      //   lines: 70,
      //   functions: 70,
      //   branches: 70,
      //   statements: 70,
      // },
    },

    // Reporter configuration
    reporters: ["default"],

    // Test timeout
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
