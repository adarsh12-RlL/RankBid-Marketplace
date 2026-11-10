import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getPaymentMode } from "@/lib/ranking";
import {
  createRazorpayClient,
  getRazorpayConfig,
  holdRazorpayDispute,
  RazorpayPendingError,
  verifyRazorpayWebhook,
  type RazorpayClient,
} from "@/lib/razorpay";
import { recordRazorpayPayment } from "@/lib/razorpay-payments";
import {
  findRazorpaySubscriptionOrder,
  processVerifiedRazorpaySubscriptionPayment,
  processVerifiedRazorpaySubscriptionRefund,
} from "@/lib/analytics-subscription-payments";

export const dynamic = "force-dynamic";

const response = (body: unknown, status = 200) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "no-store" },
});

export async function POST(req: NextRequest) {
  const mode = getPaymentMode();
  if (!["live", "stripe_test"].includes(mode)) return response({ error: "Payment environment is not enabled" }, 400);

  try {
    if (Number(req.headers.get("content-length") || 0) > 1_048_576) return response({ error: "Payload too large" }, 413);
    const raw = Buffer.from(await req.arrayBuffer());
    if (raw.length > 1_048_576) return response({ error: "Payload too large" }, 413);

    const config = getRazorpayConfig(process.env, mode !== "live");
    if (!config?.webhookSecret) throw new Error("Razorpay webhook is not configured.");
    const event: any = verifyRazorpayWebhook(
      raw,
      req.headers.get("x-razorpay-signature") || "",
      config.webhookSecret,
      { expectedAccount: config.accountId },
    );
    const suppliedEventId = req.headers.get("x-razorpay-event-id");
    if (suppliedEventId && !/^[A-Za-z0-9_-]{1,255}$/.test(suppliedEventId)) throw new Error("Invalid Razorpay event reference.");
    const eventId = suppliedEventId || event.rawBodySha256;
    const db = getDb();
    const findEvent = () => db.prepare(
      "SELECT * FROM razorpay_webhook_events WHERE account_id=? AND is_test=? AND (event_id=? OR body_hash=?)",
    ).get(config.accountId, config.isTest ? 1 : 0, eventId, event.rawBodySha256) as any;
    const existing = findEvent();
    if (existing) {
      if (existing.body_hash !== event.rawBodySha256) throw new Error("Razorpay event ID collision.");
      return response({ received: true, duplicate: true });
    }

    const type = event.event as string;
    const relevant = ["payment.captured", "payment.authorized", "order.paid", "refund.processed", "payment.dispute.created"].includes(type);
    let fetchedPayment: Record<string, any> | undefined;
    let subscriptionOrder: Record<string, any> | undefined;
    let fetchedProviderOrder: Record<string, any> | undefined;

    if (relevant) {
      const paymentId = event.payload?.payment?.entity?.id
        || event.payload?.refund?.entity?.payment_id
        || event.payload?.dispute?.entity?.payment_id
        || event.payload?.payment_dispute?.entity?.payment_id;
      if (typeof paymentId !== "string" || !/^pay_[A-Za-z0-9_]+$/.test(paymentId)) throw new Error("Razorpay event has no valid payment reference.");
      const client = createRazorpayClient(config) as RazorpayClient;
      fetchedPayment = await client.fetchPayment(paymentId);
      if (typeof fetchedPayment.order_id === "string") {
        subscriptionOrder = findRazorpaySubscriptionOrder(fetchedPayment.order_id, config.accountId, config.isTest) as Record<string, any> | undefined;
      }
      if (subscriptionOrder && ["payment.captured", "order.paid", "refund.processed"].includes(type)) {
        fetchedProviderOrder = await client.fetchOrder(fetchedPayment.order_id);
      }
    }

    db.exec("BEGIN IMMEDIATE");
    try {
      const duplicate = findEvent();
      if (duplicate) {
        if (duplicate.body_hash !== event.rawBodySha256) throw new Error("Razorpay event ID collision.");
        db.exec("COMMIT");
        return response({ received: true, duplicate: true });
      }

      if (relevant && fetchedPayment) {
        if (subscriptionOrder) {
          if (["payment.captured", "order.paid"].includes(type)) {
            try {
              processVerifiedRazorpaySubscriptionPayment(
                subscriptionOrder,
                fetchedProviderOrder!,
                fetchedPayment,
                config.accountId,
                config.isTest,
                new Date(event.created_at * 1000).toISOString(),
                false,
              );
            } catch (error) {
              if (!(error instanceof RazorpayPendingError)) throw error;
              // Authorization or an uncaptured event must never activate access.
              if (type === "order.paid") throw error;
            }
          } else if (type === "refund.processed") {
            // A refund event can arrive before the capture webhook. Reconcile the
            // provider's current captured state first, then apply the refund.
            if (fetchedPayment.captured === true && ["captured", "refunded"].includes(fetchedPayment.status)) {
              processVerifiedRazorpaySubscriptionPayment(
                subscriptionOrder, fetchedProviderOrder!, fetchedPayment, config.accountId, config.isTest, undefined, false,
              );
            }
            processVerifiedRazorpaySubscriptionRefund(subscriptionOrder, fetchedPayment, config.accountId, config.isTest, false);
          } else if (type === "payment.dispute.created") {
            db.prepare("INSERT INTO audit_logs(actor_id,action,target_id,created_at) VALUES(NULL,'analytics_subscription_dispute_received',?,?)")
              .run(subscriptionOrder.user_id, new Date().toISOString());
          }
          // payment.authorized is recorded as a webhook receipt only. Capture is
          // still required before the plan can become active.
        } else {
          try {
            recordRazorpayPayment(
              fetchedPayment,
              config,
              undefined,
              false,
              ["payment.captured", "order.paid"].includes(type) ? new Date(event.created_at * 1000).toISOString() : undefined,
            );
          } catch (error) {
            if (!(error instanceof RazorpayPendingError)) throw error;
            if (type !== "payment.authorized") throw error;
          }
          if (type === "payment.dispute.created") {
            holdRazorpayDispute(fetchedPayment.id, {
              db,
              expectedAccount: config.accountId,
              isTest: config.isTest,
              expectedOrderId: fetchedPayment.order_id,
              manageTransaction: false,
            });
          }
        }
      }

      db.prepare("INSERT INTO razorpay_webhook_events(account_id,is_test,event_id,body_hash,processed_at) VALUES(?,?,?,?,?)")
        .run(config.accountId, config.isTest ? 1 : 0, eventId, event.rawBodySha256, new Date().toISOString());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    return response({ received: true });
  } catch {
    return response({ error: "Webhook signature, merchant or captured payment could not be verified" }, 400);
  }
}
