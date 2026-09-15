import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    css: true,
    // Enable component + unit tests
    include: [
      "src/__tests__/**/*.test.ts",
      "src/components/**/*.test.tsx",
    ],
  },
});
