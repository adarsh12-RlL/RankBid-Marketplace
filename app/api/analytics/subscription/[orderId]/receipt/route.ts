import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createPaymentReceiptPdf } from "@/lib/payment-receipt-pdf";
import { getAnalyticsSubscriptionOrderForCustomer } from "@/lib/analytics-subscription-payments";
import { formatProviderPaymentMethod } from "@/lib/payment-details";

export const dynamic = "force-dynamic";
const json = (body: unknown, status: number) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "private, no-store" },
});

export async function GET(req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const user = getUser(req);
  if (!user) return json({ error: "Sign in to download this receipt." }, 401);
  if (user.role === "admin") return json({ error: "Administrator accounts do not have customer subscription receipts." }, 403);
  const { orderId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: "Invalid subscription reference." }, 400);
  const order = getAnalyticsSubscriptionOrderForCustomer(orderId, user.id) as Record<string, any> | undefined;
  if (!order || order.status !== "completed" || !order.confirmed_at || !order.provider_payment_id)
    return json({ error: "A receipt is available only after the payment provider confirms payment." }, 409);

  const currency = String(order.charge_currency || "").toUpperCase();
  const gross = Number(order.charge_amount);
  const refunded = Number(order.refunded_amount || 0);
  if (!/^[A-Z]{3}$/.test(currency) || !Number.isSafeInteger(gross) || gross <= 0 ||
      !Number.isSafeInteger(refunded) || refunded < 0 || refunded > gross)
    return json({ error: "The confirmed payment amount is unavailable." }, 409);

  const money = (minor: number) => new Intl.NumberFormat("en-US", {
    style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(minor / 100);
  const paidAt = new Date(order.confirmed_at);
  const paidAtLabel = Number.isNaN(paidAt.getTime()) ? String(order.confirmed_at) : new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium", timeStyle: "long", timeZone: "UTC",
  }).format(paidAt);
  const method = `${order.gateway} · ${formatProviderPaymentMethod({
    payment_method_type: order.payment_method_type,
    payment_method_brand: order.payment_method_brand,
    payment_method_last4: order.payment_method_last4,
    payment_wallet: order.payment_wallet,
  })}`;
  const payerNameSource = order.payer_name_source === "provider"
    ? "Provider-reported"
    : order.payer_name_source === "payer_entered" ? "Entered by payer" : "Not available";
  const status = order.revoked_at ? "Refunded" : refunded > 0 ? "Partially refunded" : "Provider confirmed";
  const pdf = createPaymentReceiptPdf([
    "RANKLENS PRO - PAYMENT RECEIPT",
    `Receipt number: RL-${order.id}`,
    `Payment status: ${status}`,
    `Environment: ${order.is_test === 1 ? "Test mode - no real funds were collected" : "Live payment"}`,
    `Confirmed at: ${paidAtLabel} (UTC)`,
    `Plan: ${order.plan_id} · ${order.duration_days} days`,
    `Amount paid: ${money(gross)}`,
    `Amount refunded: ${money(refunded)}`,
    `Net amount: ${money(gross - refunded)}`,
    `Payment provider: ${order.gateway}`,
    `Payment method: ${method}`,
    `Payer name: ${order.payer_name || "Not returned or entered at checkout"}`,
    `Payer name source: ${payerNameSource}`,
    `Payer email: ${order.payer_email || "Not returned by payment provider"}`,
    `Provider payment reference: ${order.provider_payment_id}`,
    "",
    "This receipt records a payment confirmed by the configured payment provider.",
    "Payment methods are provider-reported. Payer name is provider-reported when available, otherwise entered by the customer at checkout.",
    "Full card numbers, security codes, UPI PINs and wallet credentials are never stored here.",
  ]);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ranklens-receipt-${order.id.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
