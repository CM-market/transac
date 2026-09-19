# Transac — Android (Google Play) via Trusted Web Activity

This directory contains the deterministic configuration for packaging the Transac PWA as an
Android app using a **Trusted Web Activity (TWA)** generated with **Bubblewrap**. This is the
official, lowest-maintenance path to publish an existing PWA to the Google Play Store.

> **Scope for ticket T-026:** this repository commits the reproducible `twa-manifest.json` and
> this runbook. Generating the signed AAB and submitting it to the Play Console are performed
> by a maintainer with the toolchain and Play-developer credentials (see
> [Deferred Track](#deferred-track)).

## Prerequisites (maintainer)

- **Node.js 18+** and **npm** (for `@bubblewrap/cli`)
- **Java 8+**
- **Android SDK** (platform-tools, build-tools, platform android-30+) with `ANDROID_HOME` set
- An uploaded-signing-key compatible with Play App Signing (a keystore) — **never commit the
  keystore or its password to this repository**
- A verified host for `transac.site` (the repo's source of truth) with an SSL certificate and a
  committed **assetlinks.json** served at `https://transac.site/.well-known/assetlinks.json`
  (digital asset links verification for TWA)

## Generate the Android project

Install Bubblewrap:

```sh
npm install -g @bubblewrap/cli
```

Use the committed manifest to initialise the project (replace `./out/transac-twa` with your
chosen output directory):

```sh
bubblewrap init --manifest ./twa-manifest.json --directory ./out/transac-twa
```

> Bubblewrap fetches the PWA manifest and icons from the live site. The committed
> `frontend/public/icons/` PNGs (`icon-192x192.png`, `icon-512x512.png`) are the canonical
> launcher assets; Bubblewrap will generate the Android mipmap outputs. If `manifestUrl`
> resolution picks up a smaller icon first, you may edit the generated launcher icon resources,
> or pass the 512x512 icon directly via `bubblewrap init` inputs.

To enable Play App Signing and generate a release build:

```sh
# Create a keystore (keeps it OUT of the repo — store in your secret manager)
keytool -genkey -v -keystore transac-release.jks -alias transac \
  -keyalg RSA -keysize 2048 -validity 10000

# Set signing.enabled=true in twa-manifest.json and point signing path/alias/password at your
# keystore (do not commit these values), then:
bubblewrap build
```

The build produces a `app-release-signed.apk` (and `bundle` support via
`bubblewrap build --bundle-md5 --bundle-hash`), ready to upload as an **AAB** in Play Console.

## Submit to Google Play

1. Open **Play Console** with a developer account; create an app with package id
   `cm.market.transac`.
2. Upload the signed **AAB** under **Testing → Production → Create new release**.
3. Complete the **Store listing** using
   [`store-listing/google-play-listing.md`](../../store-listing/google-play-listing.md),
   including the required screenshots (see that file).
4. Complete **App content**, including data-safety and privacy policy sections.
5. Confirm **TWA host verification** passed for `transac.site` (assetlinks) before the review.

## Deferred Track

The step that cannot be performed in this repository/CI (no Android SDK, Java, Play credentials,
or signing key here) is generating the signed AAB and uploading it. Once the maintainer satisfies
the prerequisites above and follows the runbook, the process is mechanical and fully reproducible
from `twa-manifest.json`.

## Non-negotiables

- **No secrets in git:** signing config, keystore files, and passwords must stay out of the repo.
- **Host consistency:** `host` must remain `transac.site` (the repo source of truth); the App
  must match the deployed origin to pass Play review.
