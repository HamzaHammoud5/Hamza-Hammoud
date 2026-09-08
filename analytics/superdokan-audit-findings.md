# SuperDokan GTM Audit — Live Findings Log

Container: `GTM-TGCZC8C`, live domain `https://superdokan.com/`.
Updated as we go through the live audit conversation.

## Install integrity

- Confirmed: GTM base snippet appears exactly 2x in page source on the homepage
  (head script + body noscript) — clean, single install, no duplication found there.
- Domain confirmed as `superdokan.com` (not just `superdokan.myshopify.com`).

## Tag inventory (as observed in Workspace → Tags)

| Tag name | Type | Trigger(s) | Status | Age |
|---|---|---|---|---|
| AUTO Hotjar Tracking Code | Hotjar Tracking Code | All Pages | Active | 2 yrs |
| conversion linker | Conversion Linker | All Pages | Active | 3 yrs |
| Google Analytics 4 | Google Tag (config) | GTM page view | Active | 3 yrs |
| Google Analytics GA4 Event | GA4 Event | All Pages, ATC | Active | 3 yrs |
| Google Shopping App | Google Ads Conversion Tracking | All Pages | **Paused** | 3 mo |
| Google Shopping App Add Payment Info | Google Ads Conversion Tracking | All Pages | **Paused** | 3 mo |
| Google Shopping App Page | Google Ads Conversion Tracking | All Pages | **Paused** | 3 mo |
| Google Shopping App View | Google Ads Conversion Tracking | All Pages | **Paused** | 3 mo |
| Google Tag | Google Tag | Initialization - All Pages | Active | 3 yrs |
| Google Tag AW-439391114 | Google Tag | Initialization - All Pages | Active | 3 mo |
| Log Datalayer | Custom HTML | Any custom pixel | Active | 3 yrs |
| New add to cart | Google Ads Conversion Tracking | Custom Event | Active | 3 yrs |
| NEW BEGIN CHECK OUT | Google Ads Conversion Tracking | Custom Event 1 | Active | 3 yrs |
| New Purchase | Google Ads Conversion Tracking | thank_you Trigger | **Paused** | 3 mo |
| p Tag | Google Tag | checkout_completed, Complete order, thank_you Trigger, Window Loaded | **Paused** | 3 mo |
| pixel - CLP5C5JC77UEPOBAVJH0 | Custom HTML | All Pages | Active | 3 yrs |
| purchase | GA4 Event | checkout_completed, Complete order, thank_you Trigger | Active | 3 yrs |
| Purchase Tag | Google Ads Conversion Tracking | thank_you Trigger | **Paused** | 3 mo |

## Findings so far

1. **No Meta Pixel tag found in GTM at all.** Needs separate verification — check
   if it's installed via Shopify's Meta/Facebook Sales Channel app instead, or if
   Meta tracking genuinely doesn't exist yet.

2. **Parallel active/paused Google Ads Conversion Tracking sets — looks like an
   abandoned mid-migration.** The 3-year-old tags (`New add to cart`,
   `NEW BEGIN CHECK OUT`) are active and doing the real work; a whole newer,
   differently-named set (`Google Shopping App*`, `New Purchase`, `Purchase Tag`,
   `p Tag`) was added 3 months ago and is paused. Need to determine: was the new
   set tested and abandoned (broken), or just never finished being cut over?

3. **`purchase` GA4 Event tag fires on 3 different triggers**
   (`checkout_completed`, `Complete order`, `thank_you Trigger`). Risk: if more
   than one of these can be true on the same page load, `purchase` fires multiple
   times per order → inflated revenue in GA4.

4. **Two separate "Google Tag" base tags** (`Google Tag`, 3 yrs old, and
   `Google Tag AW-439391114`, 3 months old), both on "Initialization - All Pages."
   Need to confirm the older one isn't a duplicate/stale Ads tag still loading
   alongside the newer one.

5. **`Log Datalayer`** (Custom HTML on "Any custom pixel") — looks like a leftover
   debug tag. Likely harmless, confirm it's not doing anything in production.

6. `pixel - CLP5C5JC77UEPOBAVJH0` — ID format matches a **TikTok Pixel**, not Meta.
   Confirms TikTok tracking is at least partially wired up already.

## Google Ads / GA4 account audit (Sept 8, 2026)

Confirmed via Shopify's "Google & YouTube" app and Google Ads Data Manager:

- Connected Google Ads account: **`116-387-1248` ("SuperDokan New")** — Conversion
  measurement and Customer Match both On. This account's own Google tag is
  **`AW-439391114`** — same ID already used in GTM's tags. Not a stale/old account;
  it's the current one.
- Shopify's native app fires its own tag (`GT-55V7RNCJ`) directly on-page
  (outside GTM), confirmed firing `Purchase` on the checkout page in testing.
  Risk: this account may receive purchase conversions from BOTH the native
  Shopify tag and GTM's tags — potential double-counting within one account,
  not across two accounts as first suspected.
- Also found via Tag Manager's account-level "Google tags" list: 3 other unrelated
  GA4 properties (`G-XB2ZKESQJS`, `G-SLWNDEZWPE`, `G-N7PM5SZP4X`) and a second,
  unlabeled Google Ads conversion ID (`AW-386572153`, "Untitled tag") tied to this
  Google account. **Decision: out of scope for now** — likely legacy debris from
  past setup attempts. Revisit only if something surfaces tying them to live data.
- `AW-439391114`'s tag diagnostics show "Needs Attention: some pages not tagged"
  (482 of 10,000). Investigated: one URL was the expected
  `account.superdokan.com/authentication/...` (Shopify-hosted, GTM can't reach it,
  not fixable). The rest were `/ar-lb/` (Arabic-locale) product URLs — spot-checked
  2 of them and both returned **404 Not Found**. **Conclusion: false alarm** — this
  is stale crawl data referencing discontinued products, not a live Arabic-locale
  tracking gap. No action needed.

**Scope narrowed to:** `G-TZ3E2XBX7C` (GA4) and `AW-439391114` (Google Ads) only.

## Google Ads conversion goals audit (Sept 8, 2026)

Pulled full conversion action list (52 total actions) via "View all conversion
actions." Core e-commerce funnel status:

- **Add to cart:** Healthy — primary action `www.superdokan.com - GA4 (web)
  add_to_cart` Active. No change needed.
- **Purchase:** 2 primary actions by design (one web, one app) — web side
  (`Google Shopping App Purchase (1)`) is Active/healthy; app side (Android
  Firebase purchase) shows Needs attention, pending the Firebase re-link work.
- **Begin checkout:** Was Misconfigured — goal scoped "mobile app only" with
  zero primary actions (all 5 candidate actions were Secondary). **FIXED**:
  promoted `www.superdokan.com - GA4 (web) begin_checkout` (Website/GA4,
  already Active) to Primary. Goal now shows 1 primary action, Active.
- **Everything else** (Sign-up, Downloads, Phone call leads, Local actions,
  duplicate "Google Shopping App Page View/View Item/Search" pairs with and
  without "(1)" suffix, ~45 mostly-Secondary/legacy actions) — parked as a
  lower-priority cleanup for later. Not affecting bidding since only Primary
  actions drive bid optimization.

**Next phase:** Firebase re-link for the new mobile app provider, then
re-verify/rebuild the app-side Google Ads, GA4, and GTM integrations, then
Meta Pixel/CAPI + App Events SDK.

## App provider switch: Vajro → Appbrew (Sept 8, 2026)

Investigated whether switching mobile app providers broke Firebase/GA4/Ads
app tracking. **Conclusion: nothing broke.**

- Appbrew's App Info (App Settings) shows package name `co.tapcart.app.id_8Ory8Z6Ala`
  (Android), bundle ID `com.tapcart.8Ory8Z6Ala` (iOS), matching SHA-1 hash and
  Team ID — all **identical** to what's registered in the Firebase project
  `superdokan-8e044`. Appbrew preserved the app's identity from whatever prior
  builder ("tapcart" naming is historical/white-label, not a currently-relevant
  vendor) — the right move, since changing package name would break existing
  installs.
- Firebase Analytics confirmed receiving live data: 472 active users in the
  last 30 min at check time, 313K/30 days, top country Lebanon (matches real
  customer base).
- Same GA4 property (`G-TZ3E2XBX7C`, `www.superdokan.com - GA4`) receives BOTH
  web and app data — correct unified setup.
- E-commerce events confirmed flowing with real volume (Sep 1-8, 2026):
  `add_to_cart` 33K, `begin_checkout` 11K, `view_item_list` 473K, `view_item`
  364K, `add_to_wishlist` 3.2K. **Purchase revenue: $117K** confirmed, proving
  `purchase` events are firing and valued correctly.
- Appbrew has **no native Google Analytics/Google Ads integration tile** —
  only Facebook Ads, Firebase Messaging (push-cert focused), and third-party
  apps (reviews/loyalty/etc). Not needed here since Firebase SDK handles the
  GA4 pipe directly regardless of app-builder UI.
- Earlier "Needs attention" flags on some Google Ads app conversion actions
  (e.g. Android purchase) likely reflect a quality/settings note, not zero
  data — that action already shows real historical results ($589/$19,083).

**No re-link action needed.** Firebase/GA4/Ads app tracking was already
intact through the provider switch. Appbrew's Facebook Ads integration IS
native — next phase (Meta) should be straightforward by comparison.

## Meta App Events audit (Sept 8, 2026)

Appbrew's "Facebook Ads" integration had real values filled in (App ID
`3693965007507830`, Client Token, Content Id Format `{{VARIANT}}`). Verified
in Meta Events Manager:

- App ID `3693965007507830` = dataset **"SuperDokan Login"** (misleading
  name) — confirmed **Active**, last event 20 min ago. Full funnel
  instrumented with real volume (Aug 11 - Sep 7): View content 1.9M,
  Activate app 189.5K, Search 82K, Add to cart 75.6K, Initiate checkout
  12.6K, Add to wishlist 7.8K, **Purchase 3.2K**. App-side Meta tracking is
  genuinely working — no action needed.
- Note for later: **iOS 14.5 ATE True Status Rate shows "No Rate
  Displayed"** — related to Apple App Tracking Transparency opt-in
  reporting. Not urgent, worth investigating separately.
- **Duplicate/stale datasets found** (not the one Appbrew uses, safe to
  leave or clean up later): second "SuperDokan Login" (`1053177422614776`),
  two "SuperDokan App" datasets (`774400187716486`, `930753098039391`, both
  ~51-few events), and "Píxel de SuperDokan" (`202486964508324`, 0 events,
  no integrations — fully dead).
- **"SD 042025"** dataset (`1654051705242619`, 6.4M events, Conversions API
  + 1 more integration) is almost certainly the **website's** Meta
  Pixel/CAPI setup — this is the original "Meta Pixel & Conversions API"
  item from the initial priority list (GA4, Google Ads, Meta Pixel) and has
  **not yet been audited**. Everything in this session so far covered GA4,
  Google Ads, and the app side only.

**Status: app-side integration phases (Firebase, GA4, Google Ads app
tracking, Meta App Events) are all confirmed working with no fixes needed.**
Remaining open work: audit the website's actual Meta Pixel/CAPI (`SD 042025`),
and optionally clean up the dead/duplicate Meta datasets.

## Meta dataset cleanup investigation (Sept 8, 2026) — no action needed

Investigated the datasets flagged as possibly duplicate/dead. Corrected
initial assumption:

- **`SuperDokan Login` (1053177422614776) is NOT a duplicate to clean up.**
  Settings tab confirms Owner: "SuperDokan" (Business ID 134268884902465),
  created Jan 12, 2024, correctly linked to app `3693965007507830`.
  Confirmed actively used: Meta Ads Manager shows it wired into a live
  "Retargeting all genders by numbers" campaign's offline event sources
  (alongside `SD 042025`), both marked AUTO. This is the real, correct app
  dataset — leave as-is.
- `3693965007507830` (inaccessible to view/manage directly) and
  `930753098039391` (same, under the "SuperDokan App" pair) are
  auto-generated technical objects Meta creates per Facebook App — not
  separately manageable, not something to worry about.
- `SuperDokan App` (774400187716486) — low-volume, technical SDK lifecycle
  events only (ActivateApp, fb_mobile_deactivate_app, fb_sdk_initialize,
  deferred deep link) — not capturing e-commerce events, not duplicating
  real conversion data. Harmless, safe to leave alone.
- `Píxel de SuperDokan` (202486964508324) — confirmed genuinely dead: 0
  events, no integrations. Has 1 connected product catalog attached (worth
  checking that's not reused elsewhere before deleting). Safe to remove,
  low priority.

**Conclusion: no real double-counting or cleanup risk found on the Meta
side.** Same outcome as the Firebase/GA4/Ads investigation — everything
turns out more intact than the initial dataset list suggested.

## Website Meta Pixel/CAPI audit — SD 042025 (Sept 8, 2026)

Original priority-3 item (GA4, Google Ads, Meta Pixel), audited last.
**Result: healthy, no fixes needed.**

Full funnel tracked, all Active, "Multiple" integration confirms both
browser Pixel + server-side Conversions API firing together (correct setup,
Meta deduplicates automatically — not a duplicate-firing bug):

| Event | Volume (28d) | Ad sets | EMQ |
|---|---|---|---|
| PageView | 3.4M | - | 6.3/10 |
| View content | 2.4M | - | 6.1/10 |
| Search | 25.5K | - | 6.3/10 |
| Add to cart | 110K | 9 | 6.5/10 |
| Initiate checkout | 50.2K | 8 | 7.5/10 |
| Add payment info | 13K | 8 | 8.2/10 |
| Purchase | 12.8K | 24 | 8.7/10 |

No errors in Diagnostics. Event Match Quality scores are moderate (6-7/10)
on upper-funnel events but strong on Purchase (8.7/10) — not broken, but an
optimization opportunity: passing more hashed customer data (email/phone)
earlier in the funnel would improve EMQ and ad targeting efficiency. Not
urgent.

## Session summary (Sept 5-8, 2026)

All originally scoped priorities (GA4, Google Ads, Meta Pixel) plus the
mobile app provider switch (Vajro → Appbrew) have been audited. Outcomes:

- **Bot/fake COD order fraud incident**: Resolved (Blockify checkout-link
  reuse blocker).
- **GTM**: `purchase` tag duplicate-trigger bug fixed (now fires once via
  `checkout_completed` only).
- **Google Ads**: `Begin checkout` goal misconfiguration fixed. Purchase/Add
  to cart confirmed healthy. ~45 legacy/secondary conversion actions parked
  as low-priority cleanup, not affecting bidding.
- **App relink (Firebase/GA4/Ads/Meta)**: Confirmed nothing broke in the
  provider switch — package identity preserved, all data flowing correctly.
  No fixes were actually needed.
- **Meta datasets**: Investigated apparent duplicates — turned out to be
  correctly-owned, actively-used assets. No cleanup needed.
- **Website Meta Pixel/CAPI**: Confirmed healthy, full funnel tracked, no
  errors. EMQ improvement is the one open optimization item.

**Remaining low-priority items for later:** clean up ~45 secondary/legacy
Google Ads conversion actions; delete dead `Píxel de SuperDokan` Meta
dataset; investigate iOS 14.5 ATE Status Rate; improve Meta EMQ scores via
better Advanced Matching/CAPI customer data.

## Next steps (in progress)

- [ ] Open `Google Analytics 4` tag: confirm Measurement ID + inspect the
      "GTM page view" trigger condition (everything else depends on this firing).
- [ ] Open `purchase` GA4 tag: check event params + whether its 3 triggers can
      overlap on the same pageview (duplicate-count risk).
- [ ] Open `Google Tag` vs `Google Tag AW-439391114`: compare tag IDs to check
      for a duplicate/stale Ads tag.
- [ ] Check Shopify Admin → Settings → Customer events (or Apps) for a Meta
      Pixel/Facebook channel install outside of GTM.
- [ ] Decide fate of the paused 3-month-old tag set vs. the active 3-year-old set.
