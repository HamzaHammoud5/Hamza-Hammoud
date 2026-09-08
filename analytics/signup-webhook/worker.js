/**
 * Shopify "customers/create" webhook -> GA4 Measurement Protocol + Meta Conversions API
 *
 * Fixes the sign_up tracking gap: Shopify's hosted Customer Accounts login
 * page (account.superdokan.com) blocks client-side script injection, so
 * GTM/Pixel can never see account creation directly. This webhook is the
 * server-side workaround - Shopify calls it whenever a new customer account
 * is created, and it forwards a sign_up/CompleteRegistration event to GA4
 * and Meta directly from the server.
 *
 * Deploy as a Cloudflare Worker. See README.md in this folder for setup.
 */

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const rawBody = await request.text();

    const valid = await verifyShopifyHmac(
      rawBody,
      request.headers.get("X-Shopify-Hmac-Sha256"),
      env.SHOPIFY_WEBHOOK_SECRET
    );
    if (!valid) {
      return new Response("Invalid signature", { status: 401 });
    }

    const customer = JSON.parse(rawBody);

    const email = (customer.email || "").trim().toLowerCase();
    const phone = normalizePhone(customer.phone);

    await Promise.all([
      sendToGA4(env, customer, email),
      sendToMeta(env, customer, email, phone, request),
    ]);

    return new Response("ok", { status: 200 });
  },
};

async function verifyShopifyHmac(rawBody, headerHmac, secret) {
  if (!headerHmac || !secret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody)
  );
  const computedHmac = base64Encode(signature);

  return timingSafeEqual(computedHmac, headerHmac);
}

function base64Encode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePhone(phone) {
  if (!phone) return null;
  // Meta requires E.164 digits only, no leading +
  return phone.replace(/[^\d]/g, "");
}

async function sendToGA4(env, customer, email) {
  if (!env.GA4_MEASUREMENT_ID || !env.GA4_API_SECRET) return;

  // No real GA4 client_id is available server-side for a brand-new account;
  // this records the conversion but won't stitch to the visitor's prior
  // session. For session-level attribution, capture the _ga cookie value on
  // the signup page and pass it through (e.g. as a customer tag) instead.
  const clientId = `signup.${customer.id}`;

  const body = {
    client_id: clientId,
    events: [
      {
        name: "sign_up",
        params: {
          method: "email",
        },
      },
    ],
  };

  await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${env.GA4_MEASUREMENT_ID}&api_secret=${env.GA4_API_SECRET}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

async function sendToMeta(env, customer, email, phone, request) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_ACCESS_TOKEN) return;

  const userData = {};
  if (email) userData.em = [await sha256Hex(email)];
  if (phone) userData.ph = [await sha256Hex(phone)];

  const clientIp = request.headers.get("CF-Connecting-IP");
  if (clientIp) userData.client_ip_address = clientIp;
  const userAgent = request.headers.get("User-Agent");
  if (userAgent) userData.client_user_agent = userAgent;

  const body = {
    data: [
      {
        event_name: "CompleteRegistration",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        user_data: userData,
      },
    ],
  };

  await fetch(
    `https://graph.facebook.com/v20.0/${env.META_PIXEL_ID}/events?access_token=${env.META_CAPI_ACCESS_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}
