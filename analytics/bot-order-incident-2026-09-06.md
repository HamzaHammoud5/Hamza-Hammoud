# SuperDokan — Bot/Fake COD Order Incident (Sept 6, 2026)

Live incident log. Store: superdokan.com. Started surfacing morning of Sept 6, 2026.

## Symptom

~200 checkout attempts/min at peak. Store staff manually re-triggering Shopify's
"Bot protection" (Settings → Checkout → Bot protection) in back-to-back 60-minute
windows all morning (05:15, 06:30, 07:45, 08:40, 11:00 — see campaign log), with
"Checkouts Allowed" climbing each round (3 → 8 → 44 → 102 → 144), meaning the
attack resumes as soon as each window lapses. Orders were being canceled one by one.

## Root cause (confirmed)

Not card-testing fraud — the store uses **Cash on Delivery (COD)**, so there's no
payment/card validation step for the bot to defeat. This is a **scripted bot abusing
COD's zero payment friction** to mass-generate fake orders at no cost to the attacker.

Evidence a single order's fraud analysis showed **Landing page: `/cart/add.js`** —
Shopify's raw AJAX cart API endpoint. A real customer never "lands" there; this
confirms the bot is hitting Shopify's storefront API directly, not browsing the site.

## Confirmed shared pattern across sampled bot orders (#941078, #941131, #941195)

- All placed at the **exact same timestamp** (Sept 6, 1:07 PM)
- **No email** on any of them — phone-only contact
- All same shipping method: **"Local Delivery"**
- Phone numbers clustered in the same narrow range: `+961 76 31X XXX`
- Names/addresses mismatched nationality vs. Lebanon shipping country, and
  addresses look auto-generated (e.g. "Jessicaview," "Lake Nancy," "790 Preston
  Ridge") — consistent with a fake-data generator (e.g. Faker.js-style output)
- All flagged "1st order" (new/one-off fake customer records)
- Order count was actively climbing during the live investigation
  (8,295 → 8,299 → 8,300 → 8,301 across a few minutes)

## Existing tooling found

- Shopify's built-in scheduled **Bot protection** — only supports short manual
  windows (used as a stopgap, not a fix).
- **Blockify: Fraud Filter** app already installed. General settings audited:
  - `Auto-block spam bots` (Beta) — **ON**, but not catching this pattern.
  - `Proxy and VPN blocker` — Off
  - `Tor blocker` — Off
  - `Auto-block visitors` (same browser, rotated IP) — Off
  - `Allowed bot list` — 9 bots whitelisted (not yet audited for safety)
  - Not yet reviewed: app's separate "Fraud Filters" and "Block Checkout" pages —
    likely holds the actual rule-builder (require email, velocity limits, etc.)

## Recommended fixes (in progress)

1. Turn on Proxy/VPN blocker, Tor blocker, Auto-block visitors in Blockify —
   zero downside to real customers, may catch a chunk of this immediately.
2. Review Blockify's "Fraud Filters" / "Block Checkout" pages for a rule that
   matches the confirmed pattern (no email, COD, Local Delivery, phone range).
3. Require email at checkout (Settings → Checkout → Customer contact method) —
   removes the phone-only loophole the bot is currently using.
4. Bulk-cancel matching orders by the shared pattern instead of one-by-one.
5. Medium-term: add SMS/OTP verification specifically on COD orders — the
   durable fix, since a script can't receive real OTP codes at scale.

## Vendor response (Blockify support)

Contacted Blockify support with the confirmed pattern (COD-based, 0 orders flagged
high-risk in 7 days despite active flood, no email / "Local Delivery" / clustered
phone range, `/cart/add.js` direct-hit landing page) and confirmation that Proxy/VPN
blocker, Tor blocker, and Auto-block visitors were already turned on.

Support replied: existing setup is fine; they additionally enabled **"Stop bots
from creating fake checkout"** — blocks bots that reuse a checkout link/session to
place multiple invalid orders instead of starting a fresh session each time. Fits
the observed pattern of a script hitting `/cart/add.js` directly.

**Verification plan:** watch order count for 30-60 min to confirm it stops climbing
at the earlier rate; spot-check any new orders against the confirmed pattern. If
still leaking, escalate to requiring email at checkout + SMS/OTP verification on
COD orders (still not yet implemented as of this entry).

## Tie-in to analytics/ads priorities

If the `purchase` GTM tag fires on order creation (thank-you page) regardless of
fraud status, every one of these fake COD orders was likely reported as a real
`purchase` conversion to GA4, Google Ads, and Meta — corrupting ad bidding data.
Revisit once the bot flood is stopped: either gate `purchase` firing on order
validation, or send conversion adjustments/cancellations to Google Ads for the
affected order IDs.
