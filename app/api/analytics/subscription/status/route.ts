import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getUser } from "@/lib/auth";
import { ensureAnalyticsPlanSchema, hasAnalyticsBotAccess } from "@/lib/analytics-plan";
import { getPaymentMode } from "@/lib/ranking";
import { createStripeConnectClient, FIXED_STRIPE_RECIPIENT_ID, verifyStripeConnectRecipient, type StripeConnectClient, type StripeConnectConnection } from "@/lib/stripe-connect";
import { createRazorpayClient, getRazorpayConfig, type RazorpayClient } from "@/lib/razorpay";
import { getAnalyticsSubscriptionOrderForCustomer, processVerifiedRazorpaySubscriptionPayment, processVerifiedStripeSubscriptionFailure, processVerifiedStripeSubscriptionSession } from "@/lib/analytics-subscription-payments";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
type Row = Record<string, any>;
type CheckoutStripeClient = StripeConnectClient & {
  checkout: { sessions: { retrieve(id: string, params: Record<string, never>, options: Record<string, any>): Promise<Record<string, any>> } };
  paymentIntents: { retrieve(id: string, params: { expand: string[] }, options: Record<string, any>): Promise<Record<string, any>> };
};

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return json({ error: "Please sign in to check your payment." }, 401);
  if (user.role === "admin") return json({ error: "Administrator accounts do not use customer checkout." }, 403);
  const orderId = req.nextUrl.searchParams.get("order_id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: "Invalid subscription reference." }, 400);
  ensureAnalyticsPlanSchema();
  const order = getAnalyticsSubscriptionOrderForCustomer(orderId, user.id) as Row | undefined;
  if (!order) return json({ error: "Subscription order not found." }, 404);

  try {
    if (["pending", "completed"].includes(order.status) && order.gateway === "stripe" && order.provider_session_id) {
      const isTest = order.is_test === 1;
      const mode = getPaymentMode();
      if ((isTest && mode !== "stripe_test") || (!isTest && mode !== "live")) return json({ error: "The Stripe payment mode changed. Contact the owner to reconcile this payment." }, 409);
      const connection = createStripeConnectClient(process.env.STRIPE_SECRET_KEY, isTest ? "stripe_test" : "live", key => new Stripe(key, { timeout: 10_000 }) as unknown as CheckoutStripeClient) as StripeConnectConnection<CheckoutStripeClient>;
      const readiness = await verifyStripeConnectRecipient({ connection });
      if (readiness.accountId !== FIXED_STRIPE_RECIPIENT_ID) return json({ error: "Stripe recipient verification failed." }, 503);
      const session = await connection.client.checkout.sessions.retrieve(order.provider_session_id, {}, readiness.requestOptions);
      if (session.status === "expired") processVerifiedStripeSubscriptionFailure(session, FIXED_STRIPE_RECIPIENT_ID, isTest, "expired");
      else if (session.payment_status === "paid") {
        const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        let charge: Record<string, any> | undefined;
        if (typeof intentId === "string" && /^pi_[A-Za-z0-9_]{1,100}$/.test(intentId)) {
          const intent = await connection.client.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] }, readiness.requestOptions);
          const latest = intent.latest_charge && typeof intent.latest_charge === "object" ? intent.latest_charge : undefined;
          if (intent.id !== intentId || intent.status !== "succeeded" || intent.livemode !== !isTest ||
              intent.currency !== "usd" || intent.amount !== order.amount_cents || !latest ||
              latest.status !== "succeeded" || latest.payment_intent !== intentId || latest.currency !== "usd" ||
              latest.amount !== order.amount_cents || latest.livemode !== !isTest)
            throw new Error("Stripe has not returned matching captured-payment details yet.");
          charge = latest;
        }
        processVerifiedStripeSubscriptionSession(session, FIXED_STRIPE_RECIPIENT_ID, isTest, undefined, charge);
      }
    } else if (["pending", "completed"].includes(order.status) && order.gateway === "razorpay" && order.provider_order_id) {
      const config = getRazorpayConfig(process.env, order.is_test === 1);
      if (!config || config.accountId !== order.account_id) return json({ error: "Razorpay account verification is not available." }, 503);
      const client = createRazorpayClient(config) as RazorpayClient;
      const [providerOrder, payments] = await Promise.all([client.fetchOrder(order.provider_order_id), client.fetchOrderPayments(order.provider_order_id)]);
      for (const payment of payments.filter(item => item?.captured === true && ["captured", "refunded"].includes(item?.status))) {
        processVerifiedRazorpaySubscriptionPayment(order, providerOrder, payment, config.accountId, config.isTest);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment status could not be verified.";
    return json({ error: message.slice(0, 240) }, 503);
  }

  const fresh = getAnalyticsSubscriptionOrderForCustomer(orderId, user.id) as Row | undefined;
  const access = getDb().prepare("SELECT expires_at FROM analytics_bot_plan_access WHERE user_id=?").get(user.id) as { expires_at: string } | undefined;
  return json({ order: fresh ? {
    id: fresh.id, planId: fresh.plan_id, durationDays: fresh.duration_days, amountCents: fresh.amount_cents,
    chargeCurrency: fresh.charge_currency, chargeAmount: fresh.charge_amount, gateway: fresh.gateway,
    status: fresh.revoked_at ? "refunded" : fresh.status, createdAt: fresh.created_at, expiresAt: fresh.expires_at,
    payerName: fresh.payer_name, payerNameSource: fresh.payer_name_source, payerEmail: fresh.payer_email,
    paymentMethodType: fresh.payment_method_type, paymentMethodBrand: fresh.payment_method_brand,
    paymentMethodLast4: fresh.payment_method_last4, paymentWallet: fresh.payment_wallet,
  } : null, active: hasAnalyticsBotAccess(user.id), accessExpiresAt: access?.expires_at || null });
}
