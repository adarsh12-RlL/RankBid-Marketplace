import { NextRequest, NextResponse } from "next/server";
import { getUser, limited, sameOrigin } from "@/lib/auth";
import getDb from "@/lib/db";
import { ensureAnalyticsPlanSchema } from "@/lib/analytics-plan";
import { getPaymentMode } from "@/lib/ranking";
import { createRazorpayClient, getRazorpayConfig, verifyRazorpayCheckoutSignature, type RazorpayClient } from "@/lib/razorpay";
import { getAnalyticsSubscriptionOrderForCustomer, processVerifiedRazorpaySubscriptionPayment } from "@/lib/analytics-subscription-payments";
import { sanitizeProviderPaymentDetails } from "@/lib/payment-details";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
type Row = Record<string, any>;

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return json({ error: "Please sign in before verifying checkout." }, 401);
  if (user.role === "admin") return json({ error: "Administrator accounts do not use customer checkout." }, 403);
  if (!sameOrigin(req)) return json({ error: "Invalid request origin." }, 403);
  if (limited(req, "analytics-subscription-razorpay-verify", 12, 60_000)) return json({ error: "Too many verification attempts. Wait a moment and try again." }, 429);
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 2048) return json({ error: "Request is too large." }, 413);
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (Object.keys(body).some(key => !["orderId", "paymentId", "signature", "payerName"].includes(key))) return json({ error: "Unexpected checkout data." }, 400);
    const { orderId, paymentId, signature } = body;
    const payerName = sanitizeProviderPaymentDetails({ payer_name: body.payerName }).payer_name;
    if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId) ||
        typeof paymentId !== "string" || !/^pay_[A-Za-z0-9_]{1,100}$/.test(paymentId) ||
        typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature) ||
        !payerName || payerName.length < 2 || payerName.length > 160) return json({ error: "Invalid payment confirmation or payer name." }, 400);
    ensureAnalyticsPlanSchema();
    const order = getAnalyticsSubscriptionOrderForCustomer(orderId, user.id) as Row | undefined;
    if (!order || order.gateway !== "razorpay" || !order.provider_order_id) return json({ error: "Razorpay subscription order not found." }, 404);
    if (order.status === "completed") return json({ status: "completed" });
    if (order.status !== "pending") return json({ error: "This subscription order is no longer payable." }, 409);
    const mode = getPaymentMode();
    if ((order.is_test === 1 && mode !== "stripe_test") || (order.is_test !== 1 && mode !== "live")) return json({ error: "The payment environment changed. Contact the owner to reconcile this order." }, 409);
    const config = getRazorpayConfig(process.env, order.is_test === 1);
    if (!config || config.accountId !== order.account_id || !config.webhookSecret) return json({ error: "Razorpay verification is not configured." }, 503);
    if (!verifyRazorpayCheckoutSignature(order.provider_order_id, paymentId, signature, config.keySecret)) return json({ error: "Razorpay did not authenticate this checkout response." }, 400);
    const client = createRazorpayClient(config) as RazorpayClient;
    const [providerOrder, payment] = await Promise.all([client.fetchOrder(order.provider_order_id), client.fetchPayment(paymentId)]);
    if (payment?.captured !== true || !["captured", "refunded"].includes(payment?.status)) return json({ status: "pending", message: "Payment provider is still confirming capture." }, 202);
    processVerifiedRazorpaySubscriptionPayment(order, providerOrder, payment, config.accountId, config.isTest);
    getDb().prepare("UPDATE analytics_subscription_orders SET payer_name=COALESCE(NULLIF(payer_name,''),?),payer_name_source=CASE WHEN payer_name IS NULL OR payer_name='' THEN 'payer_entered' ELSE payer_name_source END WHERE id=? AND user_id=? AND gateway='razorpay' AND status='completed'")
      .run(payerName, orderId, user.id);
    return json({ status: "completed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Razorpay payment could not be verified.";
    return json({ error: message.slice(0, 240) }, 503);
  }
}
