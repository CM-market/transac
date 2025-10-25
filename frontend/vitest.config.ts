import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    css: true,
    // Enable only dummy tests for now
    include: ["src/__tests__/**/*.test.ts"],
  },
});
