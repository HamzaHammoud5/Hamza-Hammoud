# SuperDokan — GTM E-commerce Event Plan

Assumption: storefront is Shopify (per the SuperDokan tooling list). If it's actually
WooCommerce/custom, the event taxonomy below stays the same — only the "how events
reach the dataLayer" section changes.

## 1. Event list (priority order)

| # | Event | Fires on | Priority |
|---|-------|----------|----------|
| 1 | `purchase` | Order confirmation / thank-you | Critical — feeds GA4, Google Ads, Meta conversions |
| 2 | `add_to_cart` | Add to cart click | Critical — top-of-funnel optimization signal |
| 3 | `view_item` | Product page load | High |
| 4 | `begin_checkout` | Checkout started | High |
| 5 | `view_item_list` / `select_item` | Collection/search grid | Medium |
| 6 | `view_cart` | Cart page/drawer open | Medium |
| 7 | `remove_from_cart` | Remove from cart | Medium |
| 8 | `add_shipping_info` / `add_payment_info` | Checkout steps | Medium — lets you see checkout drop-off by step |
| 9 | `search` | Site search submitted | Low |
| 10 | `sign_up` / `login` | Account actions | Low |
| 11 | `refund` | Refund processed | Low — add after purchase is validated |

Ship in this order: `purchase` → `add_to_cart` → `view_item` → `begin_checkout` →
everything else. Purchase first because Google Ads/Meta bidding is useless without it,
even before the rest of the funnel is instrumented.

## 2. DataLayer payload shape (GA4 standard ecommerce object)

```js
// view_item
window.dataLayer.push({
  event: "view_item",
  ecommerce: {
    currency: "USD",
    value: 49.99,
    items: [{
      item_id: "SKU123",
      item_name: "Product Name",
      item_category: "Category",
      price: 49.99,
      quantity: 1
    }]
  }
});

// add_to_cart / remove_from_cart — same shape as view_item

// begin_checkout / view_cart
window.dataLayer.push({
  event: "begin_checkout",
  ecommerce: {
    currency: "USD",
    value: 89.98,
    items: [ /* array of line items, same item shape */ ]
  }
});

// purchase — the one that must be exactly right
window.dataLayer.push({
  event: "purchase",
  ecommerce: {
    transaction_id: "ORDER1001",   // required — dedupes on refresh/back-nav
    value: 89.98,
    tax: 6.50,
    shipping: 5.00,
    currency: "USD",
    coupon: "SUMMER10",            // if applicable
    items: [ /* line items */ ]
  }
});
```

Clear `dataLayer` before each ecommerce push (`window.dataLayer.push({ ecommerce: null })`)
to avoid GTM merging stale item arrays from a previous event — standard GA4 gotcha.

## 3. Shopify-specific delivery (Web Pixels / Customer Events)

Shopify blocks custom scripts on `/checkout` (Additional Scripts and checkout.liquid
are deprecated for all stores as of 2023-2024). `begin_checkout` through `purchase`
must be captured via Shopify's **Customer Events API** (Web Pixels), not a manual
`<script>` injection:

1. In Shopify Admin → Settings → Customer events, add a **Custom Pixel** (or use
   GTM's official Shopify integration if using GTM's app/pixel).
2. Subscribe to Shopify's native events and re-map them to the GA4 shape above:
   `page_viewed`, `product_viewed` → `view_item`, `product_added_to_cart` →
   `add_to_cart`, `checkout_started` → `begin_checkout`, `checkout_completed` →
   `purchase`, etc.
3. Web Pixels run in a sandboxed context — they can push to `window.dataLayer` on
   the storefront, but for checkout-page events specifically you push through the
   pixel's `analytics.subscribe()` callback, which GTM's server-side container (if
   used) or the pixel-to-dataLayer bridge then forwards.
4. Non-checkout pages (home, collection, product, cart) are normal storefront pages —
   standard GTM/dataLayer pushes via theme.liquid work fine there.

If server-side GTM isn't set up yet, this is the point to decide: client-side Web
Pixel bridging is enough to start, but Meta CAPI (next priority) will want a
server-side event source eventually for the same `purchase` data — worth keeping
`transaction_id` consistent across both from day one so dedup works later.

## 4. GTM container structure

- **Variables**: Data Layer Variables for `ecommerce.value`, `ecommerce.currency`,
  `ecommerce.transaction_id`, `ecommerce.items` (used across GA4 event tags).
- **Triggers**: one Custom Event trigger per event name (`add_to_cart`, `purchase`, …).
- **Tags**: one GA4 Event tag per funnel event, all referencing the same GA4
  Configuration tag, "Send Ecommerce Data" checked, mapped to the Data Layer
  Variables above.
- **Naming convention**: `GA4 - <event_name>`, `Trigger - <event_name>`, `DLV - ecommerce.<field>`.

## 5. QA before publish

- GTM Preview mode: confirm each event fires once (not duplicated) with correct
  `ecommerce.items` payload.
- GA4 DebugView: confirm events land with parameters populated (not blank/undefined).
- Google Tag Assistant: confirm no console errors, no missing `transaction_id` on purchase.
- Refresh the order confirmation page and confirm `purchase` does NOT re-fire
  (transaction_id dedup or a "fired once" trigger condition).

## 6. Next steps

1. Implement `purchase` + `add_to_cart` first, validate in GA4 DebugView.
2. Layer in `view_item`, `begin_checkout`.
3. Once GA4 events are clean, Google Ads conversion import and Meta Pixel/CAPI
   both consume the same `purchase` event — no separate re-instrumentation needed.
