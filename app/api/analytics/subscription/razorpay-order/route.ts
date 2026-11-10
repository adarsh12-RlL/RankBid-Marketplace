import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { ensureAnalyticsPlanSchema } from "@/lib/analytics-plan";
import { getPaymentMode } from "@/lib/ranking";
import { createRazorpayClient, getRazorpayConfig, type RazorpayClient } from "@/lib/razorpay";
import { getAnalyticsSubscriptionOrderForCustomer } from "@/lib/analytics-subscription-payments";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
type Row = Record<string, any>;

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return json({ error: "Please sign in before opening checkout." }, 401);
  if (user.role === "admin") return json({ error: "Administrator accounts do not use customer checkout." }, 403);
  const orderId = req.nextUrl.searchParams.get("order_id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: "Invalid subscription reference." }, 400);
  ensureAnalyticsPlanSchema();
  const order = getAnalyticsSubscriptionOrderForCustomer(orderId, user.id) as Row | undefined;
  if (!order || order.gateway !== "razorpay") return json({ error: "Razorpay subscription order not found." }, 404);
  if (order.status !== "pending" || !order.provider_order_id || Date.parse(order.expires_at) <= Date.now()) return json({ error: "This checkout is no longer available. Return to billing and start a new checkout." }, 409);
  const mode = getPaymentMode();
  if ((order.is_test === 1 && mode !== "stripe_test") || (order.is_test !== 1 && mode !== "live")) return json({ error: "The payment environment changed. Contact the owner to reconcile this order." }, 409);
  try {
    const config = getRazorpayConfig(process.env, order.is_test === 1);
    if (!config || config.accountId !== order.account_id || !config.webhookSecret) return json({ error: "The Razorpay merchant is not ready for this checkout." }, 503);
    const client = createRazorpayClient(config) as RazorpayClient;
    const [providerOrder, request] = await Promise.all([
      client.fetchOrder(order.provider_order_id),
      Promise.resolve(JSON.parse(order.provider_request || "null") as Record<string, any> | null),
    ]);
    if (!request || providerOrder?.id !== order.provider_order_id || providerOrder?.entity !== "order" ||
        providerOrder?.receipt !== request.receipt || providerOrder?.amount !== order.charge_amount ||
        providerOrder?.currency !== order.charge_currency || providerOrder?.notes?.internal_subscription_order_id !== order.id)
      return json({ error: "The Razorpay order does not match this saved plan. No payment was started." }, 409);
    return json({ key: config.keyId, orderId: providerOrder.id, amount: providerOrder.amount, currency: providerOrder.currency,
      name: "RankLens Pro", description: `${order.duration_days} days of premium analytics`, email: user.email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Razorpay checkout could not be prepared.";
    return json({ error: message.slice(0, 220) }, 503);
  }
}
