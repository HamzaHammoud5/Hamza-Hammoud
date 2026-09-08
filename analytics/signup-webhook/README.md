# Sign-up tracking: Shopify webhook -> GA4 + Meta

## Why this exists

Shopify's Customer Accounts login (`account.superdokan.com`) is a Shopify-
hosted page — the same restriction as checkout, no custom script injection
allowed. GTM/Pixel can never see account creation directly on that domain.
This webhook is the server-side workaround: Shopify calls it the moment a
new customer account is created, and it forwards the event straight to GA4
and Meta from the server side, bypassing the page restriction entirely.

## What it does

1. Shopify sends a `customers/create` webhook (POST, JSON) whenever someone
   creates an account.
2. The worker verifies the request really came from Shopify (HMAC signature
   check) — never skip this, it stops anyone from forging fake sign-up events.
3. It sends a `sign_up` event to GA4 via Measurement Protocol, and a
   `CompleteRegistration` event to Meta via Conversions API (hashed
   email/phone for matching, per Meta's requirements).

## Deploy (Cloudflare Workers — free tier is enough for this volume)

1. Install Wrangler if you don't have it: `npm install -g wrangler`
2. From this folder: `wrangler init` (or `wrangler deploy worker.js` directly
   if you already have a Workers project set up)
3. Set the required secrets — **never hardcode these in the code**:
   ```
   wrangler secret put SHOPIFY_WEBHOOK_SECRET
   wrangler secret put GA4_MEASUREMENT_ID
   wrangler secret put GA4_API_SECRET
   wrangler secret put META_PIXEL_ID
   wrangler secret put META_CAPI_ACCESS_TOKEN
   ```
4. `wrangler deploy` — note the resulting `*.workers.dev` URL (or your own
   custom domain if you attach one).

## Where to get each credential

| Secret | Where to get it |
|---|---|
| `SHOPIFY_WEBHOOK_SECRET` | Generated when you create the webhook below — Shopify shows it once, save it immediately. |
| `GA4_MEASUREMENT_ID` | Already known: `G-TZ3E2XBX7C` |
| `GA4_API_SECRET` | GA4 Admin → Data Streams → your web stream → **Measurement Protocol API secrets** → Create |
| `META_PIXEL_ID` | Already known: `1654051705242619` (the `SD 042025` dataset) |
| `META_CAPI_ACCESS_TOKEN` | Meta Events Manager → select `SD 042025` → Settings → **Conversions API** → Generate access token |

## Register the webhook in Shopify

Shopify Admin → Settings → Notifications → scroll to **Webhooks** → Create
webhook:
- Event: **Customer creation**
- Format: JSON
- URL: your deployed Worker URL from above
- API version: latest stable

Shopify will show the signing secret at this point — that's your
`SHOPIFY_WEBHOOK_SECRET`.

## Test it

1. Create a test customer account through the actual signup flow on
   `account.superdokan.com`.
2. Check the Worker's logs (`wrangler tail`) to confirm it received and
   processed the webhook without errors.
3. In GA4 → Reports → Realtime, look for a `sign_up` event within a minute
   or two.
4. In Meta Events Manager → `SD 042025` → Test events, confirm
   `CompleteRegistration` shows up.

## After it's live: import into Google Ads

Once `sign_up` shows real, sustained volume in GA4 (give it a few days):

1. Google Ads → Conversions → **+ Create conversion action**
2. Choose **Import** → **Google Analytics 4 properties**
3. Select the `sign_up` event, category "Sign-up," conversion window as
   appropriate (30 days is reasonable for account creation)
4. Set it as **Primary** for the Sign-up goal, replacing the old broken
   `www.superdokan.com - GA4 - SuperDokan Shopping (iOS) sign_up` action
   (which showed "Firebase not linked" — that one can be set to Secondary
   or removed once the new one is confirmed working).

## Known limitation

The GA4 `client_id` sent here is synthetic (`signup.<customer_id>`), not the
visitor's real GA4 session — there's no way to recover their actual
Google Analytics client ID from a server-side Shopify webhook alone. This
means the sign_up event is correctly counted in GA4/Ads, but it won't stitch
to the visitor's earlier browsing session for user-journey/funnel reports.
If that level of attribution matters later, the fix is to capture the `_ga`
cookie value on the signup page and pass it through (e.g. as a hidden
customer tag/metafield at account creation) so the webhook can use the real
client ID instead.
