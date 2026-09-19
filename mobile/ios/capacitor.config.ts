import { CapacitorConfig } from "@capacitor/cli";

/**
 * Transac — iOS (App Store) wrapper configuration (Capacitor / WKWebView).
 *
 * This is the deterministic config used to scaffold a native iOS shell that loads the
 * Transac PWA from `https://transac.site` in production.
 *
 * The committed JSON mirror (`capacitor.config.json`) is kept identical to this file's
 * asserted fields so that `src/__tests__/storeConfig.test.ts` can validate the config
 * without needing a TypeScript runtime in the test environment.
 */
const config: CapacitorConfig = {
  appId: "cm.market.transac",
  appName: "Transac",
  webDir: "../../frontend/dist",
  backgroundColor: "#10B981",
  server: {
    url: "https://transac.site",
    cleartext: false,
  },
  ios: {
    scheme: "Transac",
    minimumVersion: "14.0",
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
