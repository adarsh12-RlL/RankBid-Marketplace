import { NextRequest, NextResponse } from "next/server";
import { getUser, limited } from "@/lib/auth";
import { quoteAnalyticsPlan, type AnalyticsPlanId } from "@/lib/analytics-plan";
import { getPaymentMode } from "@/lib/ranking";
import { paymentGateways } from "@/lib/payment-gateways";
import { getRazorpayConfig } from "@/lib/razorpay";
import { razorpayCharge } from "@/lib/checkout-pricing";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return json({ error: "Please sign in to view a subscription quote." }, 401);
  if (user.role === "admin") return json({ error: "Administrator accounts do not purchase customer plans." }, 403);
  if (limited(req, "analytics-subscription-quote", 60, 60_000)) return json({ error: "Too many quote requests. Please wait and try again." }, 429);

  const params = req.nextUrl.searchParams;
  const planId = params.get("plan") as AnalyticsPlanId | null;
  const durationDays = Number(params.get("days"));
  const gateway = params.get("gateway");
  if (!planId || !( ["day", "monthly", "yearly"] as string[]).includes(planId)) return json({ error: "Choose an available plan." }, 400);
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3660) return json({ error: "Choose a duration from 1 to 3,660 days." }, 400);
  if (gateway !== "stripe" && gateway !== "razorpay") return json({ error: "Choose an available payment provider." }, 400);

  try {
    if (!paymentGateways().some(item => item.id === gateway && item.enabled)) return json({ error: "This payment provider is not ready for secure subscription checkout." }, 503);
    const mode = getPaymentMode();
    if (mode !== "live" && mode !== "stripe_test") return json({ error: "Secure subscription payments are not configured." }, 503);
    const quote = quoteAnalyticsPlan(planId, durationDays);
    if (gateway === "stripe") {
      const key = process.env.STRIPE_SECRET_KEY || "";
      const webhook = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
      const isLive = mode === "live";
      if (!/^sk_(test|live)_[A-Za-z0-9_]+$/.test(key) || !webhook || key.includes("_live_") !== isLive)
        return json({ error: "Stripe is not ready for subscription checkout." }, 503);
      return json({ gateway, currency: "USD", amountMinor: quote.amountCents, amount: quote.amountCents / 100 });
    }

    const config = getRazorpayConfig(process.env, mode === "stripe_test");
    if (!config?.webhookSecret) return json({ error: "Razorpay is not ready for subscription checkout." }, 503);
    const charge = razorpayCharge(quote.amountCents, config);
    return json({ gateway, currency: charge.currency, amountMinor: charge.amount, amount: charge.amount / 100 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "A payment quote could not be prepared.";
    return json({ error: message.slice(0, 220) }, 503);
  }
}
