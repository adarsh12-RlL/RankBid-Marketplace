import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import getDb from "@/lib/db";
import { createPaymentReceiptPdf } from "@/lib/payment-receipt-pdf";
import { formatProviderPaymentMethod } from "@/lib/payment-details";

export const dynamic = "force-dynamic";

const json = (body: unknown, status: number) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "private, no-store" },
});

export async function GET(req: NextRequest, context: { params: Promise<{ paymentId: string }> }) {
  const user = getUser(req);
  if (!user) return json({ error: "Sign in to download this receipt." }, 401);
  const { paymentId } = await context.params;
  if (!/^[1-9]\d{0,14}$/.test(paymentId)) return json({ error: "Invalid payment reference." }, 400);

  const payment = getDb().prepare(`
    SELECT pay.*,p.name AS product_name,p.domain AS product_domain
    FROM payments pay LEFT JOIN products p ON p.id=pay.product_id
    WHERE pay.id=?
  `).get(Number(paymentId)) as Record<string, any> | undefined;
  if (!payment || (user.role !== "admin" && payment.user_id !== user.id))
    return json({ error: "Payment not found." }, 404);
  if (payment.verified !== 1 || !payment.confirmed_at || !["completed", "refunded", "disputed"].includes(payment.status))
    return json({ error: "A receipt is available only after the payment provider confirms the payment." }, 409);

  const currency = String(payment.presentment_currency || payment.charge_currency || "usd").toUpperCase();
  const minorAmount = Number(payment.presentment_amount ?? payment.charge_amount ?? payment.amount_cents);
  if (!Number.isSafeInteger(minorAmount) || minorAmount < 0 || !/^[A-Z]{3}$/.test(currency))
    return json({ error: "The confirmed receipt amount is unavailable." }, 409);
  const refundedCents = Number(payment.refunded_cents ?? 0);
  const canonicalAmountCents = Number(payment.amount_cents);
  if (!Number.isSafeInteger(refundedCents) || refundedCents < 0 || !Number.isSafeInteger(canonicalAmountCents) ||
      canonicalAmountCents <= 0 || refundedCents > canonicalAmountCents)
    return json({ error: "The confirmed refund record is unavailable." }, 409);
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minorAmount / 100);
  const date = new Date(payment.confirmed_at);
  const paidAt = Number.isNaN(date.getTime()) ? String(payment.confirmed_at) : new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium", timeStyle: "long", timeZone: "UTC",
  }).format(date);
  const method = `${payment.provider || "Payment provider"} · ${formatProviderPaymentMethod({
    payment_method_type: payment.payment_method_type,
    payment_method_brand: payment.payment_method_brand,
    payment_method_last4: payment.payment_method_last4,
    payment_wallet: payment.payment_wallet,
  })}`;
  const payerNameSource = payment.payer_name_source === "provider"
    ? "Provider-reported"
    : payment.payer_name_source === "payer_entered" ? "Entered by payer" : "Not available";
  const canonicalMoney = (minor: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);
  const providerReference = payment.stripe_payment_intent_id || payment.razorpay_payment_id || payment.provider_payment_id || payment.transaction_id || "Unavailable";
  const pdf = createPaymentReceiptPdf([
    "RANKBID - PAYMENT RECEIPT",
    `Receipt number: RB-${payment.id}`,
    `Payment status: ${payment.status === "completed" ? "Provider confirmed" : payment.status}`,
    `Environment: ${payment.is_test === 1 ? "Test mode - no real funds were collected" : "Live payment"}`,
    `Paid at: ${paidAt} (UTC)`,
    `Product: ${payment.product_name || "RankBid placement"}`,
    `Website: ${payment.product_domain || "Not provided"}`,
    `Amount received: ${amount}`,
    `Refund recorded (USD placement ledger): ${canonicalMoney(refundedCents)}`,
    `Net eligible placement spend (USD ledger): ${canonicalMoney(canonicalAmountCents - refundedCents)}`,
    `Payment method: ${method}`,
    `Payer name: ${payment.payer_name || "Not returned or entered at checkout"}`,
    `Payer name source: ${payerNameSource}`,
    `Payer email: ${payment.payer_email || "Not provided by payment provider"}`,
    `Provider reference: ${providerReference}`,
    "",
    "This receipt records a payment verified by the configured payment provider.",
    "Payment methods are provider-reported. Payer name is provider-reported when available, otherwise entered by the customer at checkout.",
    "It does not contain full card numbers, security codes, UPI PINs, or wallet credentials.",
  ]);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rankbid-receipt-${payment.id}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
