import crypto from "node:crypto";
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getUser, limited, sameOrigin } from "@/lib/auth";
import { ensureAnalyticsPlanSchema, hasAnalyticsBotAccess, listAnalyticsPlans, quoteAnalyticsPlan, type AnalyticsPlanId } from "@/lib/analytics-plan";
import { getPaymentMode } from "@/lib/ranking";
import { paymentGateways } from "@/lib/payment-gateways";
import { createStripeConnectClient, FIXED_STRIPE_RECIPIENT_ID, getDirectChargeRequestOptions, verifyStripeConnectRecipient, type StripeConnectClient, type StripeConnectConnection } from "@/lib/stripe-connect";
import { createOrRecoverRazorpayOrder, createRazorpayClient, getRazorpayConfig, type RazorpayClient, type RazorpayOrderRequest } from "@/lib/razorpay";
import { razorpayCharge } from "@/lib/checkout-pricing";
import { setAnalyticsSubscriptionProviderOrder, setAnalyticsSubscriptionProviderSession } from "@/lib/analytics-subscription-payments";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
type CheckoutStripeClient = StripeConnectClient & { checkout: { sessions: { create(params: Record<string, any>, options: Record<string, any>): Promise<Record<string, any>> } } };
type SavedOrder = Record<string, any>;

function appOrigin(isTest: boolean) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) throw new Error("The site owner must configure the public HTTPS app URL before enabling checkout.");
  const url = new URL(configured);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const localTest = isTest && process.env.NODE_ENV !== "production" && loopback && url.protocol === "http:";
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || (url.protocol !== "https:" && !localTest))
    throw new Error("Checkout needs a clean HTTPS application URL (HTTP is allowed only for local test mode).");
  if (process.env.APP_URL && new URL(process.env.APP_URL).origin !== url.origin)
    throw new Error("APP_URL and NEXT_PUBLIC_APP_URL must use the same trusted origin.");
  return url.origin;
}

function safeOrder(order: SavedOrder) {
  const plans = listAnalyticsPlans();
  const plan = plans.find(item => item.id === order.plan_id);
  return {
    id: order.id, planId: order.plan_id, planLabel: plan?.label ?? "RankLens Pro",
    durationDays: order.duration_days, amountCents: order.amount_cents, currency: "USD",
    chargeCurrency: order.charge_currency, chargeAmount: order.charge_amount, gateway: order.gateway,
    status: order.revoked_at ? "refunded" : order.status, createdAt: order.created_at, expiresAt: order.expires_at,
    payerName: order.payer_name, payerNameSource: order.payer_name_source, payerEmail: order.payer_email,
    paymentMethodType: order.payment_method_type, paymentMethodBrand: order.payment_method_brand,
    paymentMethodLast4: order.payment_method_last4, paymentWallet: order.payment_wallet,
    providerPaymentId: order.provider_payment_id,
  };
}

function getOrCreateOrder(input: { userId: string; planId: AnalyticsPlanId; durationDays: number; gateway: "stripe" | "razorpay"; accountId: string; isTest: boolean; idem: string; email: string; chargeCurrency: string; chargeAmount: number }) {
  const db = getDb();
  const quote = quoteAnalyticsPlan(input.planId, input.durationDays);
  db.exec("BEGIN IMMEDIATE");
  try {
    const previous = db.prepare("SELECT * FROM analytics_subscription_orders WHERE idempotency_key=?").get(input.idem) as SavedOrder | undefined;
    if (previous) {
      if (previous.user_id !== input.userId || previous.plan_id !== input.planId || previous.duration_days !== input.durationDays || previous.gateway !== input.gateway || previous.account_id !== input.accountId || previous.is_test !== (input.isTest ? 1 : 0))
        throw new Error("This checkout key was already used for a different order. Start a new checkout.");
      db.exec("COMMIT");
      return previous;
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    const razorpayRequest = input.gateway === "razorpay" ? JSON.stringify({
      amount: input.chargeAmount,
      currency: input.chargeCurrency,
      receipt: `rla_${id.replaceAll("-", "")}`,
      notes: { internal_subscription_order_id: id },
    }) : null;
    db.prepare(`INSERT INTO analytics_subscription_orders
      (id,user_id,plan_id,duration_days,amount_cents,markup_percent,currency,gateway,is_test,account_id,charge_currency,charge_amount,provider_request,idempotency_key,expires_at,created_at)
      VALUES(?,?,?,?,?,?,'usd',?,?,?,?,?,?,?,?,?)`)
      .run(id, input.userId, input.planId, input.durationDays, quote.amountCents, quote.markupPercent,
        input.gateway, input.isTest ? 1 : 0, input.accountId, input.chargeCurrency, input.chargeAmount,
        razorpayRequest, input.idem, expiresAt, now);
    db.prepare("INSERT INTO audit_logs(actor_id,action,target_id,created_at) VALUES(?,'analytics_subscription_checkout_started',?,?)").run(input.userId, id, now);
    const order = db.prepare("SELECT * FROM analytics_subscription_orders WHERE id=?").get(id) as SavedOrder;
    db.exec("COMMIT");
    return order;
  } catch (error) { try { db.exec("ROLLBACK"); } catch {} throw error; }
}

async function stripeCheckout(order: SavedOrder, email: string) {
  const mode = order.is_test ? "stripe_test" : "live";
  const connection = createStripeConnectClient(process.env.STRIPE_SECRET_KEY, mode,
    key => new Stripe(key, { timeout: 10_000 }) as unknown as CheckoutStripeClient) as StripeConnectConnection<CheckoutStripeClient>;
  const readiness = await verifyStripeConnectRecipient({ connection });
  if (readiness.accountId !== order.account_id || readiness.requestOptions.stripeAccount !== FIXED_STRIPE_RECIPIENT_ID)
    throw new Error("The configured Stripe recipient does not match this order.");
  const base = appOrigin(!!order.is_test);
  const marker = new URLSearchParams({ payment: "success", order_id: order.id });
  const cancel = new URLSearchParams({ payment: "cancelled", order_id: order.id });
  const plan = listAnalyticsPlans().find(item => item.id === order.plan_id)!;
  const metadata = { analytics_subscription_order_id: order.id };
  const params = {
    mode: "payment",
    client_reference_id: order.id,
    customer_email: email,
    billing_address_collection: "required",
    name_collection: { individual: { enabled: true } },
    metadata,
    payment_intent_data: { metadata },
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: order.amount_cents,
      product_data: { name: `RankLens Pro · ${plan.label}`, description: `Analytics premium access for ${order.duration_days} days.` } } }],
    success_url: `${base}/datafast/dashboard/billing?${marker.toString()}`,
    cancel_url: `${base}/datafast/dashboard/billing?${cancel.toString()}`,
    expires_at: Math.min(Math.floor(Date.now() / 1000) + 23 * 3600, Math.floor(Date.parse(order.expires_at) / 1000)),
  };
  const session = await connection.client.checkout.sessions.create(params, {
    ...readiness.requestOptions, ...getDirectChargeRequestOptions(),
    idempotencyKey: `ranklens-subscription-${order.id}`,
  });
  if (!session || typeof session.id !== "string" || !/^cs_[A-Za-z0-9_]+$/.test(session.id) || typeof session.url !== "string")
    throw new Error("Stripe did not return a hosted checkout session. The order remains pending.");
  setAnalyticsSubscriptionProviderSession(order.id, session.id, session.url);
  return { checkoutUrl: session.url, providerOrderId: session.id };
}

async function razorpayCheckout(order: SavedOrder) {
  const config = getRazorpayConfig(process.env, !!order.is_test);
  if (!config || config.accountId !== order.account_id || !config.webhookSecret)
    throw new Error("Razorpay merchant, account or signed webhook setup is incomplete.");
  const client = createRazorpayClient(config) as RazorpayClient;
  let request: RazorpayOrderRequest;
  try { request = JSON.parse(order.provider_request || "null") as RazorpayOrderRequest; }
  catch { throw new Error("The saved Razorpay request is invalid. No new charge was created."); }
  if (!request || request.notes?.internal_subscription_order_id !== order.id || request.amount !== order.charge_amount || request.currency !== order.charge_currency || request.receipt !== `rla_${order.id.replaceAll("-", "")}`)
    throw new Error("The saved Razorpay amount or order reference does not match.");
  let providerOrderId = order.provider_order_id as string | null;
  if (!providerOrderId) {
    const db = getDb();
    const started = db.prepare("UPDATE analytics_subscription_orders SET provider_create_started_at=? WHERE id=? AND gateway='razorpay' AND status='pending' AND provider_create_started_at IS NULL")
      .run(new Date().toISOString(), order.id).changes;
    providerOrderId = await createOrRecoverRazorpayOrder(request, client, { allowCreate: started === 1 });
    setAnalyticsSubscriptionProviderOrder(order.id, providerOrderId, `/datafast/razorpay/checkout?order_id=${encodeURIComponent(order.id)}`);
  }
  return { checkoutUrl: `/datafast/razorpay/checkout?order_id=${encodeURIComponent(order.id)}`, providerOrderId };
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return json({ error: "Please sign in to manage a RankLens plan." }, 401);
  if (user.role === "admin") return json({ isAdmin: true, active: true, plans: [], enabledGateways: [], orders: [] });
  ensureAnalyticsPlanSchema();
  const db = getDb();
  const access = db.prepare("SELECT expires_at FROM analytics_bot_plan_access WHERE user_id=?").get(user.id) as { expires_at: string } | undefined;
  const orders = db.prepare("SELECT * FROM analytics_subscription_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 20").all(user.id) as SavedOrder[];
  const activeGateways = paymentGateways().filter(gateway => gateway.enabled && (gateway.id === "stripe" || gateway.id === "razorpay"));
  return json({ plans: listAnalyticsPlans(), active: hasAnalyticsBotAccess(user.id), expiresAt: access?.expires_at || null,
    enabledGateways: activeGateways.map(({ id, name, currency, description }) => ({ id, name, currency, description })),
    orders: orders.map(safeOrder) });
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return json({ error: "Please sign in before starting a subscription checkout." }, 401);
  if (user.role === "admin") return json({ error: "Administrator accounts do not purchase customer plans." }, 403);
  if (!sameOrigin(req)) return json({ error: "Invalid request origin." }, 403);
  if (limited(req, "analytics-subscription-checkout", 5, 60_000)) return json({ error: "Too many checkout attempts. Please wait and try again." }, 429);
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 2048) return json({ error: "Request is too large." }, 413);
    const input = JSON.parse(raw) as { planId?: unknown; durationDays?: unknown; gateway?: unknown; idempotencyKey?: unknown };
    if (typeof input.planId !== "string" || !( ["day", "monthly", "yearly"] as string[]).includes(input.planId)) return json({ error: "Choose an available plan." }, 400);
    if (typeof input.gateway !== "string" || !( ["stripe", "razorpay"] as string[]).includes(input.gateway)) return json({ error: "Choose an available payment provider." }, 400);
    if (typeof input.idempotencyKey !== "string" || !/^[0-9a-f-]{36}$/i.test(input.idempotencyKey)) return json({ error: "Refresh the checkout and try again." }, 400);
    const planId = input.planId as AnalyticsPlanId;
    const configured = listAnalyticsPlans().find(plan => plan.id === planId)!;
    const durationDays = input.durationDays === undefined ? configured.days : Number(input.durationDays);
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3660) return json({ error: "Choose a duration from 1 to 3,660 days." }, 400);
    const mode = getPaymentMode();
    if (mode !== "live" && mode !== "stripe_test") return json({ error: "Secure subscription payments are not configured. Ask the owner to finish payment provider and webhook setup." }, 503);
    const gateway = input.gateway as "stripe" | "razorpay";
    const advertised = paymentGateways().find(item => item.id === gateway && item.enabled);
    if (!advertised) return json({ error: "This payment provider is not ready for secure subscription checkout." }, 503);
    let accountId: string, chargeCurrency = "USD", chargeAmount: number;
    if (gateway === "stripe") {
      const expectedMode = mode === "live" ? "live" : "stripe_test";
      const key = process.env.STRIPE_SECRET_KEY || "";
      const webhook = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
      if (!/^sk_(test|live)_[A-Za-z0-9_]+$/.test(key) || !webhook || (key.includes("_live_") !== (expectedMode === "live")))
        return json({ error: "Stripe key, mode or signed webhook is not configured." }, 503);
      accountId = FIXED_STRIPE_RECIPIENT_ID;
      const quote = quoteAnalyticsPlan(planId, durationDays);
      chargeAmount = quote.amountCents;
    } else {
      const config = getRazorpayConfig(process.env, mode === "stripe_test");
      if (!config?.webhookSecret) return json({ error: "Razorpay key, merchant account or signed webhook is not configured." }, 503);
      accountId = config.accountId;
      const quote = quoteAnalyticsPlan(planId, durationDays);
      const charge = razorpayCharge(quote.amountCents, config);
      chargeCurrency = charge.currency;
      chargeAmount = charge.amount;
    }
    const quote = quoteAnalyticsPlan(planId, durationDays);
    const order = getOrCreateOrder({ userId: user.id, planId, durationDays, gateway, accountId, isTest: mode === "stripe_test", idem: input.idempotencyKey, email: user.email, chargeCurrency, chargeAmount });
    if (order.status === "completed") return json({ error: "This checkout has already been paid.", order: safeOrder(order) }, 409);
    if (order.status !== "pending" || Date.parse(order.expires_at) <= Date.now()) return json({ error: "This checkout expired. Start a new subscription checkout." }, 409);
    if (order.amount_cents !== quote.amountCents || order.markup_percent !== quote.markupPercent) return json({ error: "The saved checkout quote changed. Start a new checkout." }, 409);
    const result = gateway === "stripe" ? await stripeCheckout(order, user.email) : await razorpayCheckout(order);
    const fresh = getDb().prepare("SELECT * FROM analytics_subscription_orders WHERE id=? AND user_id=?").get(order.id, user.id) as SavedOrder;
    return json({ ok: true, order: safeOrder(fresh), checkoutUrl: result.checkoutUrl }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Secure checkout could not be started.";
    return json({ error: message.slice(0, 300) }, 400);
  }
}
