"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";

type CheckoutDetails = {
  key: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  email: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, any>) => { open(): void };
  }
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function RankLensRazorpayCheckout({ orderId }: { orderId: string }) {
  const router = useRouter();
  const launchCheckoutRef = useRef<(() => void) | null>(null);
  const payerNameRef = useRef("");
  const [details, setDetails] = useState<CheckoutDetails | null>(null);
  const [payerName, setPayerName] = useState("");
  const [busy, setBusy] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [message, setMessage] = useState("");

  const checkPayment = useCallback(async (tries = 1) => {
    setChecking(true);
    setMessage("Checking the payment provider for a verified capture…");
    try {
      for (let attempt = 0; attempt < tries; attempt++) {
        const response = await fetch(`/api/analytics/subscription/status?order_id=${encodeURIComponent(orderId)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Payment status could not be checked.");
        if (result.order?.status === "completed" && result.active) {
          router.replace(`/datafast/dashboard/billing?payment=success&order_id=${encodeURIComponent(orderId)}`);
          return true;
        }
        if (result.order?.status === "refunded") {
          setMessage("This payment was refunded, so its RankLens Pro access is no longer active.");
          return false;
        }
        if (["failed", "expired"].includes(result.order?.status)) {
          setMessage("This checkout has ended without an active plan. Return to billing to start a new one.");
          return false;
        }
        if (attempt + 1 < tries) await wait(1200);
      }
      setMessage("The provider has not confirmed capture yet. Your plan stays inactive until confirmation arrives.");
      return false;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment status could not be checked.");
      return false;
    } finally {
      setChecking(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    let cancelled = false;
    async function prepare() {
      if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
        setMessage("This checkout link is invalid. Return to billing and choose a plan again.");
        setBusy(false);
        return;
      }
      try {
        const response = await fetch(`/api/analytics/subscription/razorpay-order?order_id=${encodeURIComponent(orderId)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Razorpay checkout could not be prepared.");
        if (cancelled) return;
        setDetails(result);
        setBusy(false);

        const openCheckout = () => {
          if (cancelled || !window.Razorpay) return;
          const checkout = new window.Razorpay({
            key: result.key,
            order_id: result.orderId,
            amount: result.amount,
            currency: result.currency,
            name: result.name,
            description: result.description,
            prefill: { name: payerNameRef.current, email: result.email },
            theme: { color: "#ef693f" },
            modal: { ondismiss: () => setMessage("Checkout was closed. If you completed a payment, check its status below.") },
            handler: async (confirmation: Record<string, string>) => {
              setChecking(true);
              setMessage("Payment submitted. Waiting for Razorpay to confirm capture…");
              try {
                const verified = await fetch("/api/analytics/subscription/razorpay-verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId, paymentId: confirmation.razorpay_payment_id, signature: confirmation.razorpay_signature, payerName: payerNameRef.current }),
                });
                const body = await verified.json();
                if (!verified.ok && verified.status !== 202) throw new Error(body.error || "Payment could not be verified.");
                if (body.status === "completed") {
                  await checkPayment(4);
                } else {
                  await checkPayment(8);
                }
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Payment is awaiting provider confirmation.");
              } finally {
                setChecking(false);
              }
            },
          });
          checkout.open();
        };
        const launchCheckout = () => {
          if (cancelled) return;
          if (window.Razorpay) {
            openCheckout();
            return;
          }
          let script = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
          if (script?.dataset.checkoutFailed === "true") {
            script.remove();
            script = null;
          }
          const isNewScript = !script;
          script ??= document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          setCheckoutLoading(true);
          setMessage("Loading secure Razorpay checkout…");
          script.addEventListener("load", () => {
            setCheckoutLoading(false);
            if (!cancelled && window.Razorpay) openCheckout();
            else if (!cancelled) setMessage("Razorpay checkout did not initialize. Retry or return to billing.");
          }, { once: true });
          script.addEventListener("error", () => {
            script!.dataset.checkoutFailed = "true";
            setCheckoutLoading(false);
            setMessage("Razorpay checkout could not load. Check your connection and retry.");
          }, { once: true });
          if (isNewScript) document.body.appendChild(script);
        };
        launchCheckoutRef.current = launchCheckout;
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Razorpay checkout could not be prepared.");
          setBusy(false);
        }
      }
    }
    void prepare();
    return () => { cancelled = true; };
  }, [orderId, checkPayment]);

  return <main className="rl-billing-page">
    <div className="rl-billing-shell rl-provider-checkout">
      <Link href="/datafast/dashboard/billing" className="rl-billing-back"><ArrowLeft size={16}/> Back to billing</Link>
      <section className="rl-provider-card" aria-live="polite">
        <div className="rl-billing-checkout-icon"><CreditCard size={21}/></div>
        <span className="lens-eyebrow">SECURE PROVIDER CHECKOUT</span>
        <h1>Complete your RankLens Pro payment</h1>
        <p>{details ? `${details.description}. Signed in as ${details.email}.` : "Preparing a secure Razorpay checkout for this account…"}</p>
        <label className="rl-payer-name-label" htmlFor="ranklens-payer-name">Payer name</label>
        <input
          id="ranklens-payer-name"
          className="rl-payer-name"
          autoComplete="name"
          maxLength={160}
          value={payerName}
          disabled={busy || !details}
          onChange={event => {
            const value = event.target.value;
            setPayerName(value);
            payerNameRef.current = value;
            setMessage("");
          }}
          placeholder="Full name used for payment"
        />
        <p className="rl-payer-name-help">Enter the name of the person making this payment. It will appear on the receipt. Razorpay displays payment methods enabled for this merchant, currency and location; the list may include UPI/QR, wallets, cards or bank options.</p>
        <div className="rl-provider-status">
          {busy || checking || checkoutLoading ? <LoaderCircle size={17} className="rl-spin"/> : <ShieldCheck size={17}/>}
          <span>{message || (busy ? "Verifying the saved order and merchant…" : "Your plan activates only after Razorpay confirms payment capture.")}</span>
        </div>
        {!busy && <div className="rl-provider-actions">
          <button type="button" disabled={checking || checkoutLoading} className="lens-cta" onClick={() => {
            const cleanName = payerNameRef.current.replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim();
            if (details && launchCheckoutRef.current) {
              if (cleanName.length < 2 || cleanName.length > 160) {
                setMessage("Enter the payer’s full name (2–160 characters) before continuing.");
                return;
              }
              payerNameRef.current = cleanName;
              setPayerName(cleanName);
              launchCheckoutRef.current();
            } else void checkPayment(4);
          }}>
            {checking || checkoutLoading ? "Checking…" : details ? "Continue to secure checkout" : "Check payment status"}
          </button>
          <Link href="/datafast/dashboard/billing" className="rl-provider-secondary">Return to billing</Link>
        </div>}
      </section>
    </div>
  </main>;
}
