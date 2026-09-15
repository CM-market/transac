import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    css: true,
    // Enable unit tests for both TS and TSX test files
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
  },
});
