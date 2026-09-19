import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Snapshot helper for T-026 store-config validation.
 *
 * Reads the committed store config JSON (TWA for Android, Capacitor JSON mirror for iOS)
 * from the repository root so the vitest suite can assert the required-field contract
 * without needing a TypeScript runtime or the native toolchain.
 *
 * The two configs are the build inputs that a maintainer feeds to Bubblewrap (Android) and
 * Capacitor (iOS); validating their fields here guard-rails the host/site consistency that
 * Play/App Store review enforce.
 */

// This file lives at frontend/src/__tests__/__fixtures__/readStoreConfigs.ts
// Repo root is four levels up.
const fixtureDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(fixtureDir, "../../../../");

export interface TwaManifest {
  packageId: string;
  host: string;
  name: string;
  shortName: string;
  launcherName: string;
  display: string;
  themeColor: string;
  backgroundColor: string;
  startUrl: string;
  appVersionName: string;
  appVersionCode: number;
  icons: unknown[];
  [key: string]: unknown;
}

export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  backgroundColor: string;
  server: {
    url: string;
    cleartext: boolean;
  };
  [key: string]: unknown;
}

export function readTwaManifest(): TwaManifest {
  const raw = readFileSync(
    resolve(repoRoot, "mobile/android/twa-manifest.json"),
    "utf8",
  );
  return JSON.parse(raw) as TwaManifest;
}

export function readCapacitorConfig(): CapacitorConfig {
  const raw = readFileSync(
    resolve(repoRoot, "mobile/ios/capacitor.config.json"),
    "utf8",
  );
  return JSON.parse(raw) as CapacitorConfig;
}
