import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { processStripeEvent } from "@/lib/payments";
import { getPaymentMode } from "@/lib/ranking";
import { processVerifiedStripeSubscriptionFailure, processVerifiedStripeSubscriptionRefund, processVerifiedStripeSubscriptionSession } from "@/lib/analytics-subscription-payments";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  const mode = getPaymentMode(),
    sig = req.headers.get("stripe-signature");
  if (
    !["live", "stripe_test"].includes(mode) ||
    !sig ||
    !webhookSecret
  )
    return NextResponse.json(
      { error: "Verified Stripe configuration and signature required" },
      { status: 400 },
    );
  try {
    if (Number(req.headers.get("content-length") || 0) > 1048576)
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const body = await req.text();
    if (body.length > 1048576)
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      webhookSecret,
    );
    if (event.livemode !== (mode === "live"))
      return NextResponse.json(
        { error: "Payment mode mismatch" },
        { status: 400 },
      );
    const accountId = event.account || "";
    const object = event.data.object as unknown as Record<string, any>;
    let handledAsSubscription = false;
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded")
      handledAsSubscription = processVerifiedStripeSubscriptionSession(object, accountId, event.livemode === false,
        Number.isSafeInteger(event.created) ? new Date(event.created * 1000).toISOString() : undefined);
    else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed")
      handledAsSubscription = processVerifiedStripeSubscriptionFailure(object, accountId, event.livemode === false,
        event.type === "checkout.session.expired" ? "expired" : "failed");
    else if (event.type === "charge.refunded")
      handledAsSubscription = processVerifiedStripeSubscriptionRefund(object, accountId, event.livemode === false);
    if (!handledAsSubscription) processStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook or unmatched payment" },
      { status: 400 },
    );
  }
}
