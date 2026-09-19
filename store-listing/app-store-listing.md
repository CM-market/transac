# Apple App Store Listing — Transac

Use this copy when completing the **App Store** listing in App Store Connect for the app with
bundle id `cm.market.transac` (Capacitor WKWebView; source of truth host:
`https://transac.site`).

## App information (App Store Connect)

- **Name:** Transac
- **Subtitle (30 chars max):** B2B Marketplace for Cameroon
- **Promotional text:** Latest products from verified local businesses. Now with offline
  browsing and full bilingual support.
- **Description:**

  > Transac is a professional B2B marketplace built for Cameroon. Whether you are a buyer
  > looking for trusted suppliers or a seller ready to grow your store, Transac makes it easy
  > to discover products, compare offers, and connect directly with verified businesses.
  >
  > **For buyers:**
  > - Browse featured and trending products by category, price, and location
  > - View detailed product information with supplier and trust indicators
  > - Build a cart and place orders via a direct WhatsApp conversation with the supplier
  > - Track past orders and re-order with one tap
  > - Full English and French (bilingual) support
  >
  > **For sellers:**
  > - Create and manage your store with a unique shareable store link
  > - Add products with images, pricing, and stock in seconds
  > - Get discovered instantly across the marketplace
  > - Apply for a Verified Store badge to boost buyer confidence
  >
  > Transac is available in English and French and works offline for core browsing once
  > installed.

- **Keywords (100 chars max, comma-separated):**
  `B2B, marketplace, Cameroon, business, trade, buy, sell, commerce, supplier, store`

- **Support URL:** `https://transac.site`
- **Marketing URL (optional):** `https://transac.site`
- **Copyright:** `2025 Transac. All rights reserved.`

## App privacy

- **Privacy policy URL:** `https://transac.site/privacy` _(placeholder — required by App Review)_
- Complete the **App Privacy** section describing data collection (device certificate, order,
  and product data as applicable).

## Screenshots (REQUIRED by App Review)

App Store Connect requires **6.7" Display** screenshots (iPhone Pro Max/Plus family,
1290x2796 px) and recommends **5.5"** and **6.1"** variants. Requirements by display size:

| Display size | Required resolution |
|--------------|---------------------|
| 6.7" | 1290 x 2796 px |
| 6.5" | 1242 x 2688 px |
| 6.1" | 1179 x 2556 px |
| 5.5" | 1242 x 2208 px |

Provide **3 screenshots** at minimum per display size; the Transac capture spec lives in
`frontend/public/screenshots/README.md`:

1. Marketplace / homepage
2. Product listing with filters
3. Product details page
4. Seller dashboard
5. Cart / order via WhatsApp

Also recommended for the **App Preview (optional):** a 30-second video MP4 (Apple's supported
codec), 1080x1920 px for 6.5" family.

> **Status:** `frontend/public/screenshots/` currently contains the spec (`README.md`) but
> **no PNG images yet**. Capturing real screenshots requires the running application and a
> capture tool, which is a **manual/deferred** step for this ticket — see the Deferred Track in
> `mobile/ios/README.md`. The tables above are the spec to fulfil.

## App icon

- **App Store icon:** 1024x1024 px, no transparency, no rounded corners (App Store applies its
  own mask) — use `frontend/public/icons/icon-512x512.png` scaled/upscaled as the base, or
  provide a dedicated 1024x1024 source.

## App Review notes

- The app is a WKWebView shell loading `https://transac.site` (cleartext disabled). Provide
  **Review notes**: demo/seller and buy credentials for the reviewer, and note that core
  browsing works offline after first load.
