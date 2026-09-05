# SuperDokan — GTM/GA4 Audit Checklist

Use this to audit an existing GTM + GA4 setup: what's firing, what's broken, what's
missing. Pairs with `analytics/gtm-ecommerce-events.md` (the target event list).

## 1. Inventory what's currently firing

- GA4 → Admin → Events: export the full list of events + 30-day counts.
- Diff that list against the target events in `gtm-ecommerce-events.md`:
  - ✅ firing correctly
  - ⚠️ firing but with bad/missing data
  - ❌ missing entirely
  - 🗑️ firing but shouldn't (test/leftover junk from a previous agency or dev)

## 2. Check GTM container health

- Version history: confirm the live version matches what you think is published;
  check timestamps of recent edits against any date where numbers looked off.
- Tags list: look for **duplicate GA4 Configuration tags** (different or same
  Measurement ID firing twice) — the #1 cause of inflated pageviews/events.
- Preview mode: walk the full funnel (view product → add to cart → checkout →
  test purchase) and confirm each tag fires exactly once, on the right trigger,
  with real (non-empty) variable values.

## 3. Check GA4 data quality

- DebugView: walk the same funnel live, inspect each event's parameters.
- Look for `(not set)` values on item name/category/price — usually a Data Layer
  Variable path mismatch between what's pushed and what GTM reads.
- Confirm `purchase` has: `transaction_id`, `value`, `currency`, populated `items[]`.
- Check Enhanced Measurement settings (Admin → Data Streams → your stream) — if
  it auto-sends `page_view`/`scroll`/`click` and GTM *also* has manual tags for
  those, that's a duplicate source.
- Check Consent Mode status if there's EU traffic — events may be dropped
  instead of modeled if it's not configured.

## 4. Check Meta side for the same issues

- Meta Events Manager → Diagnostics tab: auto-flags missing/malformed parameters.
- Test Events tool: live inspection, same idea as GA4 DebugView.
- Confirm Pixel + CAPI aren't double-counting — same `event_id` should dedupe them.
- Common one: Pixel base code installed both manually in theme AND via GTM →
  doubled PageView/traffic numbers in Meta only (GA4 unaffected) — a good signal
  the containers are out of sync.

## 5. Symptom → likely cause reference

| Symptom | Likely cause |
|---|---|
| Pageviews/sessions ~2x expected | Duplicate GTM snippet or duplicate GA4 config tag |
| `purchase` count > actual orders | Missing `transaction_id`, or refires on refresh/back-nav |
| GA4 revenue ≠ Shopify order totals | Missing `value`/`currency`, wrong/duplicated `items[]` |
| `(not set)` in item reports | DataLayer variable path mismatch |
| `add_to_cart` fires without a real click | Trigger scoped too broadly (e.g. page load, not click) |
| Meta traffic much higher than GA4 | Pixel installed twice (manual + GTM) |
| EU traffic missing/underreported | Consent Mode not configured |
| Sudden event drop on a specific date | Untested edit published around that date — check GTM version history |

## 6. Fix priority

Same order as the build plan: `purchase` accuracy first (it's what Google
Ads/Meta bidding consumes), then `add_to_cart`, then the rest of the funnel.
Don't spend time on `view_item_list`/`search` polish while `purchase` is
double-counting or missing revenue data.
