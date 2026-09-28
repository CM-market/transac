import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    css: true,
    // Explicit allow-list. We append each new suite we own (CartContext,
    // ProductDetailPage, CartPage) rather than using a broad glob, so that
    // unrelated suites that are broken/empty on main (BuyerDashboard.test.tsx,
    // MarketplaceWelcome.test.tsx, NotificationBell.test.tsx) stay excluded the
    // same way they were before this ticket.
    include: [
      "src/__tests__/**/*.test.ts",
      "src/components/StoreCreationModal.test.tsx",
      "src/components/SellerDashboard.test.tsx",
      "src/components/StoreViewModal.test.tsx",
      "src/components/Profile.test.tsx",
      "src/contexts/CartContext.test.tsx",
      "src/pages/ProductDetailPage.test.tsx",
      "src/pages/CartPage.test.tsx",
    ],
  },
});
