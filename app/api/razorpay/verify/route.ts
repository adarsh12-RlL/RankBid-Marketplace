import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getUser, sameOrigin, limited } from "@/lib/auth";
import {
  createRazorpayClient,
  getRazorpayConfig,
  RazorpayPendingError,
  verifyRazorpayCheckoutSignature,
} from "@/lib/razorpay";
import { recordRazorpayPayment } from "@/lib/razorpay-payments";
import { sanitizeProviderPaymentDetails } from "@/lib/payment-details";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (limited(req, "razorpay-verify", 40)) return NextResponse.json({ error: "Too many verification attempts" }, { status: 429 });

  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 2048) return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (Object.keys(body).some(key => !["paymentId", "payerName", "razorpay_order_id", "razorpay_payment_id", "razorpay_signature"].includes(key)))
      return NextResponse.json({ error: "Unexpected checkout data" }, { status: 400 });

    const paymentId = Number(body.paymentId);
    const payerName = sanitizeProviderPaymentDetails({ payer_name: body.payerName }).payer_name;
    if (!Number.isSafeInteger(paymentId) || paymentId < 1 || !payerName || payerName.length < 2 || payerName.length > 160 ||
        typeof body.razorpay_order_id !== "string" || typeof body.razorpay_payment_id !== "string" ||
        typeof body.razorpay_signature !== "string")
      return NextResponse.json({ error: "Invalid payment confirmation or payer name" }, { status: 400 });

    const db = getDb();
    const order = db.prepare("SELECT * FROM payments WHERE id=? AND provider='razorpay'").get(paymentId) as Record<string, any> | undefined;
    if (!order || (order.user_id !== user.id && user.role !== "admin"))
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const config = getRazorpayConfig(process.env, !!order.is_test);
    if (!config || config.accountId !== order.razorpay_account_id || body.razorpay_order_id !== order.provider_payment_id ||
        !verifyRazorpayCheckoutSignature(order.provider_payment_id, body.razorpay_payment_id, body.razorpay_signature, config.keySecret))
      return NextResponse.json({ error: "Payment signature does not match this order" }, { status: 400 });

    const fetched = await createRazorpayClient(config).fetchPayment(body.razorpay_payment_id);
    const result = recordRazorpayPayment(fetched, config, order.provider_payment_id);
    if (result.status === "completed" && user.id === order.user_id) {
      db.prepare("UPDATE payments SET payer_name=COALESCE(NULLIF(payer_name,''),?),payer_name_source=CASE WHEN payer_name IS NULL OR payer_name='' THEN 'payer_entered' ELSE payer_name_source END WHERE id=? AND user_id=? AND provider='razorpay' AND verified=1 AND status='completed'")
        .run(payerName, paymentId, user.id);
    }
    return NextResponse.json({ verified: true, status: result.status, paymentId: result.paymentId });
  } catch (error) {
    if (error instanceof RazorpayPendingError)
      return NextResponse.json({ verified: false, status: "pending", message: "Payment is authorised but has not been captured yet." }, { status: 202 });
    return NextResponse.json({ error: "Razorpay could not confirm the captured payment. The website will wait for verified status." }, { status: 400 });
  }
}
