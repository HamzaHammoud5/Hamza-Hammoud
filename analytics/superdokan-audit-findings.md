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
