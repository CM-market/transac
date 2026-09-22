import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    css: true,
    // Dummy tests plus the store creation modal suite
    include: [
      "src/__tests__/**/*.test.ts",
      "src/components/StoreCreationModal.test.tsx",
      "src/components/SellerDashboard.test.tsx",
    ],
  },
});
