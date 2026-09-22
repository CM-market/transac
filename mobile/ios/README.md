# Transac — iOS (App Store) via Capacitor

Apple does not accept plain PWAs in the App Store. This directory contains the deterministic
**Capacitor** configuration that wraps the Transac web app in a native WKWebView shell for
distribution through the Apple App Store.

> **Scope for ticket T-026:** this repository commits `capacitor.config.ts` (+ a JSON mirror for
> testability) and this runbook. Scaffolding the Xcode project, compiling/archiving, and
> submitting to App Store Connect are performed by a maintainer on macOS with an Apple Developer
> account (see [Deferred Track](#deferred-track)).

## Prerequisites (maintainer)

- **macOS** with **Xcode** installed (Capacitor iOS requires Xcode)
- **Node.js 18+** and **npm**
- Apple Developer Program membership with an App Store Connect **app id**
  `cm.market.transac` and signing certificates/provisioning

## Scaffold the iOS shell

From this `mobile/ios` directory:

```sh
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/ios
```

Build the web assets first (the Capacitor `webDir` is `../../frontend/dist`):

```sh
cd ../../frontend
npm ci
npm run build
```

Then add and sync the iOS platform using the committed config:

```sh
cd ../mobile/ios
npx cap init Transac cm.market.transac --web-dir ../../frontend/dist
npx cap add ios
npx cap sync ios
```

> `npx cap init` reads the committed `capacitor.config.ts`; if it warns about appId/name,
> the committed config wins — keep `capacitor.config.ts` as the single source of truth and
> re-run `npx cap sync ios` after any change.

## Configure the native project

In Xcode (`ios/App/App.xcodeproj`):

1. Set the **Bundle Identifier** to `cm.market.transac`.
2. Select the **Transac** target → **Signing & Capabilities**, choose your Team and complete
   signing for archive/distribution.
3. The app loads `https://transac.site` in production (`server.url` + `cleartext: false`), so
   an **App Transport Security** exception is **not** required. Keep NSAllowsArbitraryLoads off.

## Archive and submit

```sh
# Build the archive from the project root (capacitor syncs first):
npx cap sync ios
npx cap open ios   # opens Xcode; use Product → Archive
```

Then, in **App Store Connect**:

1. Create an app record with bundle id `cm.market.transac`.
2. Upload the archived IPA via Xcode Organizer or **Transporter**.
3. Complete the **App Store listing** using
   [`store-listing/app-store-listing.md`](../../store-listing/app-store-listing.md),
   including the required screenshots.
4. Submit for review (privacy policy, App Privacy labels, and compliance questions required).

## Deferred Track

Scaffolding the Xcode project, compiling/archiving the IPA, and uploading to App Store Connect
cannot be performed in this repository/CI (requires macOS, Xcode, and an Apple Developer
account). Once the maintainer follows the runbook from `capacitor.config.ts`, the process is
fully reproducible.

## Non-negotiables

- **No secrets in git:** signing certificates/provisioning must stay out of the repo.
- **Host consistency:** `server.url` must remain `https://transac.site` (the repo source of
  truth); cleartext must stay `false` so the app only talks to the live HTTPS site.
- `capacitor.config.json` is the **test mirror** of `capacitor.config.ts` — keep the asserted
  fields in sync (the vitest suite enforces this).
