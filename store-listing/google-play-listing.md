# Google Play Store Listing — Transac

Use this copy when completing the **Store listing** page in Google Play Console for the app
with package id `cm.market.transac` (TWA source of truth host: `https://transac.site`).

## App identity

- **App name:** Transac
- **Short description (80 chars max):**
  > B2B marketplace for Cameroon — connect, trade, and grow your business.
- **Full description:**

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

- **Application type:** Application
- **Category (primary):** Shopping
- **Category (secondary):** Business
- **Content rating:** See Play Console questionnaire (commerce/non-regulated content).

## Contact details

- **Website:** `https://transac.site`
- **Email:** `support@transac.site` _(placeholder — replace with the operative support inbox)_
- **Phone:** _(optional, add support line)_

## Data safety & privacy

- **Privacy policy URL:** `https://transac.site/privacy` _(placeholder — a privacy page is a
  Play review requirement; create and point at the real URL)_
- Complete the **Data safety** form describing how device certificates are generated/
  stored and how product data is handled.

## Screenshots (REQUIRED by Play)

Play requires a minimum of **two**, recommended 4–8 phone screenshots and (optionally)
tablet screenshots. Upload **PNG or JPEG, 320–3840 px** on the shortest side; **16:9 or 9:16**
aspect ratios recommended.

Required set for the Transac listing (specified in `frontend/public/screenshots/README.md`):

| # | Asset | Dimensions | Content |
|---|-------|-----------|---------|
| 1 | `desktop-1.png` | 1280x720 | Desktop marketplace/homepage |
| 2 | `mobile-1.png` | 390x844 | Mobile marketplace/homepage |
| 3 | `mobile-2.png` | 390x844 | Product listing with filters |
| 4 | `mobile-3.png` | 390x844 | Product details page |
| 5 | `mobile-4.png` | 390x844 | Seller dashboard |
| 6 | `mobile-5.png` | 390x844 | Cart / order via WhatsApp |

> **Status:** `frontend/public/screenshots/` currently contains the spec
> (`README.md`) but **no PNG images yet**. Capturing real screenshots requires the running
> application (dev or prod) and a capture tool, which is a **manual/deferred** step for this
> ticket — see the Deferred Track in `mobile/android/README.md`. The table above is the spec to
> fulfil.

## Feature graphic & icons

- **Feature graphic (optional but recommended):** 1024x500 px, JPEG or PNG.
- **Icon:** 512x512 px — use `frontend/public/icons/icon-512x512.png` (TWA launcher) as the
  source; adjust rounded-corner safe zone per Play requirements (Play applies its own mask).

## Marketing / localisation

- Localised copy can be added per-locale in Play Console; Transac ships English and French —
  provide both when available.
