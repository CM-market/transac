import { describe, it, expect, beforeAll } from "vitest";
import {
  readTwaManifest,
  readCapacitorConfig,
  type TwaManifest,
  type CapacitorConfig,
} from "./__fixtures__/readStoreConfigs";

/**
 * T-026 store-config validation.
 *
 * Transac is a web PWA distributed to app stores via a native wrapper. Devs feed the
 * committed configs (Bubblewrap "twa-manifest.json" for the Google Play Store, Capacitor's
 * JSON mirror for the Apple App Store) into the wrapper toolchains. These tests pin the
 * contract those configs must satisfy — most importantly the public host, which must match
 * the repo's source of truth (https://transac.site) or Play/App Store review will reject.
 */

const SOURCE_OF_TRUTH_HOST = "transac.site";
const SOURCE_OF_TRUTH_URL = `https://${SOURCE_OF_TRUTH_HOST}`;

let twa: TwaManifest;
let cap: CapacitorConfig;

beforeAll(() => {
  twa = readTwaManifest();
  cap = readCapacitorConfig();
});

describe("TWA manifest (Google Play Store, Bubblewrap)", () => {
  it("declares a reverse-domain packageId", () => {
    expect(twa.packageId).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)+$/);
  });

  it("uses the transac.site source-of-truth host", () => {
    expect(twa.host).toBe(SOURCE_OF_TRUTH_HOST);
  });

  it("matches the signed-in host with the manifest URL", () => {
    if (typeof twa.manifestUrl === "string") {
      expect(twa.manifestUrl).toContain(SOURCE_OF_TRUTH_URL);
    }
  });

  it("declares the app identity", () => {
    expect(twa.name).toBe("Transac - B2B Marketplace");
    expect(twa.shortName).toBe("Transac");
    expect(twa.launcherName).toBe("Transac");
  });

  it("uses standalone display and the repo theme color", () => {
    expect(twa.display).toBe("standalone");
    expect(twa.themeColor).toBe("#10B981");
    expect(twa.backgroundColor).toBe("#ffffff");
  });

  it("starts at the site root", () => {
    expect(twa.startUrl).toBe("/");
  });

  it("declares a version and at least one launcher icon", () => {
    expect(twa.appVersionName).toBeTruthy();
    expect(twa.appVersionCode).toBeGreaterThan(0);
    expect(Array.isArray(twa.icons)).toBe(true);
    expect(twa.icons.length).toBeGreaterThan(0);
  });
});

describe("Capacitor config (Apple App Store)", () => {
  it("declares a reverse-domain appId", () => {
    expect(cap.appId).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)+$/);
  });

  it("matches the TWA packageId/bundle id", () => {
    expect(cap.appId).toBe(twa.packageId);
  });

  it("names the app Transac", () => {
    expect(cap.appName).toBe("Transac");
  });

  it("points webDir at the built frontend bundle", () => {
    expect(cap.webDir).toBe("../../frontend/dist");
  });

  it("loads the site over HTTPS with cleartext disabled", () => {
    expect(cap.server.url).toBe(SOURCE_OF_TRUTH_URL);
    expect(cap.server.cleartext).toBe(false);
  });

  it("keeps the host consistent with the TWA manifest", () => {
    // Extract the host from the configured URL and compare to the TWA host.
    const configuredHost = new URL(cap.server.url).host;
    expect(configuredHost).toBe(SOURCE_OF_TRUTH_HOST);
    expect(configuredHost).toBe(twa.host);
  });

  it("declares the repo theme as background color", () => {
    expect(cap.backgroundColor).toBe("#10B981");
  });
});
