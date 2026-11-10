"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, CreditCard, LoaderCircle, ShieldCheck } from "lucide-react";
import type { MarketingPlan } from "@/components/RankLensMarketing";
import { formatProviderPaymentMethod } from "@/lib/payment-details";

type PlanId = "day" | "monthly" | "yearly";
type Gateway = { id: "stripe" | "razorpay"; name: string; currency: string; description: string };
type Quote = { gateway: "stripe" | "razorpay"; currency: string; amountMinor: number; amount: number };
type Order = { id: string; planId: PlanId; planLabel: string; durationDays: number; amountCents: number; chargeCurrency: string; chargeAmount: number; gateway: string; status: string; createdAt: string; expiresAt: string; payerName?: string | null; payerNameSource?: "provider" | "payer_entered" | null; payerEmail?: string | null; paymentMethodType?: string | null; paymentMethodBrand?: string | null; paymentMethodLast4?: string | null; paymentWallet?: string | null };
type Props = { email: string; botAccess: boolean; expiresAt: string | null; initialPlan: PlanId; plans: MarketingPlan[]; paymentResult?: "success" | "cancelled"; orderId?: string };
const MAX_DAYS = 3660;
const money = (amount: number, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function RankLensBillingClient({ email, botAccess, expiresAt, initialPlan, plans: initialPlans, paymentResult, orderId }: Props) {
  const [plans, setPlans] = useState(initialPlans);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [providerQuote, setProviderQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(initialPlan);
  const [inputDays, setInputDays] = useState(String(initialPlans.find(plan => plan.id === initialPlan)?.days ?? 30));
  const [gateway, setGateway] = useState<Gateway["id"] | "">("");
  const [active, setActive] = useState(botAccess);
  const [currentExpiry, setCurrentExpiry] = useState(expiresAt);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"info" | "error" | "success">("info");
  const durationDays = /^\d+$/.test(inputDays) ? Number(inputDays) : 0;
  const validDays = Number.isInteger(durationDays) && durationDays >= 1 && durationDays <= MAX_DAYS;
  const selectedPlan = plans.find(plan => plan.id === selectedPlanId) ?? plans[0];
  const quotedCents = useMemo(() => selectedPlan && validDays
    ? Math.max(100, Math.round((selectedPlan.price / selectedPlan.days) * durationDays * 100))
    : 0, [selectedPlan, validDays, durationDays]);

  const loadBilling = useCallback(async () => {
    const response = await fetch("/api/analytics/subscription", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Billing details could not be loaded.");
    setPlans(data.plans ?? []);
    setGateways(data.enabledGateways ?? []);
    setOrders(data.orders ?? []);
    setActive(!!data.active);
    setCurrentExpiry(data.expiresAt ?? null);
    setGateway(current => current || data.enabledGateways?.[0]?.id || "");
  }, []);

  const checkOrder = useCallback(async (id: string, tries = 1) => {
    let lastStatus = "pending";
    for (let attempt = 0; attempt < tries; attempt++) {
      const response = await fetch(`/api/analytics/subscription/status?order_id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payment status could not be checked.");
      lastStatus = data.order?.status || "pending";
      if (lastStatus === "completed" && data.active) {
        setActive(true);
        setCurrentExpiry(data.accessExpiresAt ?? null);
        setMessage("Payment verified. RankLens Pro is active on your account.");
        setMessageKind("success");
        await loadBilling();
        return true;
      }
      if (lastStatus === "refunded") {
        setMessage("This payment was refunded, so its RankLens Pro access is no longer active.");
        setMessageKind("info");
        await loadBilling();
        return false;
      }
      if (["failed", "expired"].includes(lastStatus)) break;
      if (attempt + 1 < tries) await wait(1400);
    }
    setMessage(lastStatus === "failed" || lastStatus === "expired"
      ? "The payment was not completed. Your plan is still inactive; you can start a new checkout."
      : "The provider has not confirmed payment yet. Your plan remains inactive until verification completes.");
    setMessageKind("info");
    await loadBilling();
    return false;
  }, [loadBilling]);

  useEffect(() => {
    let cancelled = false;
    loadBilling().catch(error => {
      if (!cancelled) {
        setMessage(error instanceof Error ? error.message : "Billing details could not be loaded.");
        setMessageKind("error");
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadBilling]);

  useEffect(() => {
    if (!selectedPlan || !validDays || !gateway) {
      setProviderQuote(null);
      setQuoteError("");
      setQuoteLoading(false);
      return;
    }
    let cancelled = false;
    setProviderQuote(null);
    setQuoteLoading(true);
    setQuoteError("");
    const timer = window.setTimeout(async () => {
      try {
        const query = new URLSearchParams({ plan: selectedPlan.id, days: String(durationDays), gateway });
        const response = await fetch(`/api/analytics/subscription/quote?${query}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "The selected provider quote is unavailable.");
        if (!cancelled) setProviderQuote(data as Quote);
      } catch (error) {
        if (!cancelled) {
          setProviderQuote(null);
          setQuoteError(error instanceof Error ? error.message : "The selected provider quote is unavailable.");
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 220);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [selectedPlan, durationDays, validDays, gateway]);

  useEffect(() => {
    if (paymentResult === "cancelled") {
      setMessage("Checkout was cancelled. No RankLens Pro access was activated.");
      setMessageKind("info");
      return;
    }
    if (paymentResult !== "success" || !orderId) return;
    setBusy(true);
    setMessage("Checking the payment directly with the provider…");
    void checkOrder(orderId, 10).catch(error => {
      setMessage(error instanceof Error ? error.message : "Payment verification is still pending.");
      setMessageKind("info");
    }).finally(() => setBusy(false));
  }, [paymentResult, orderId, checkOrder]);

  function choosePlan(plan: MarketingPlan) {
    setSelectedPlanId(plan.id as PlanId);
    setInputDays(String(plan.days));
  }
  async function startCheckout() {
    if (!selectedPlan || !validDays || !gateway || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/analytics/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan.id, durationDays, gateway, idempotencyKey: crypto.randomUUID() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Secure checkout could not be started.");
      if (typeof data.checkoutUrl !== "string" || !data.checkoutUrl) throw new Error("The payment provider did not return a checkout page.");
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Secure checkout could not be started.");
      setMessageKind("error");
      setBusy(false);
    }
  }

  return <main className="rl-billing-page">
    <div className="rl-billing-shell">
      <Link href="/datafast/dashboard" className="rl-billing-back"><ArrowLeft size={16}/> Back to RankLens</Link>
      <header className="rl-billing-heading">
        <span className="lens-eyebrow">CUSTOMER SUBSCRIPTION</span>
        <h1>Choose your RankLens plan</h1>
        <p>Signed in as <strong>{email}</strong>. Select a plan, then choose an exact duration from 1 to {MAX_DAYS} days.</p>
      </header>

      {active && <div className="rl-billing-active" role="status"><Check size={18}/><div><strong>RankLens Pro is active</strong><p>{currentExpiry ? `Current access ends ${new Date(currentExpiry).toLocaleString()}.` : "Premium tools are available on this account."} A verified renewal extends the current expiry.</p></div></div>}
      {message && <div className={`rl-billing-request-status ${messageKind}`} role={messageKind === "error" ? "alert" : "status"}>{message}</div>}

      <section className="rl-billing-plans" aria-label="Available plans">
        {plans.map(plan => <button type="button" key={plan.id} className={`rl-billing-plan${selectedPlanId === plan.id ? " selected" : ""}`} aria-pressed={selectedPlanId === plan.id} onClick={() => choosePlan(plan)}>
          <span className="rl-billing-plan-top"><span>{plan.label}</span>{selectedPlanId === plan.id && <Check size={17}/>}</span>
          <strong>{money(plan.price)}<small> / {plan.days} {plan.days === 1 ? "day" : "days"}</small></strong>
          <span className="rl-billing-plan-copy">{plan.features.slice(0, 2).join(" · ")}</span>
          <span className="rl-billing-plan-markup">{plan.markupPercent ?? 0}% RankBid placement markup during active access</span>
        </button>)}
      </section>

      <section className="rl-billing-summary">
        <div className="rl-billing-days">
          <label htmlFor="subscription-days"><CalendarDays size={17}/> Subscription duration</label>
          <div className="rl-billing-days-input"><input id="subscription-days" type="number" min={1} max={MAX_DAYS} step={1} inputMode="numeric" value={inputDays} onChange={event => setInputDays(event.target.value)} aria-describedby="subscription-days-help"/><span>{Number(inputDays) === 1 ? "day" : "days"}</span></div>
          <small id="subscription-days-help">Set any duration from 1 to {MAX_DAYS} days. The selected plan’s daily rate is used for custom durations.</small>
        </div>
        <div className="rl-billing-price"><span>{gateway ? "Payment provider quote" : "Estimated subscription total"}</span><strong>{quoteLoading ? "Updating…" : providerQuote ? money(providerQuote.amount, providerQuote.currency) : validDays && selectedPlan ? money(quotedCents / 100) : "—"}</strong><small>{quoteError || (gateway && providerQuote ? `Charged in ${providerQuote.currency}. The server recalculates this quote before checkout.` : "Minimum checkout is $1.00. The server recalculates the final amount before creating an order.")}</small></div>
      </section>

      <div className="rl-billing-feature-list"><h2>Premium tools included</h2><ul>{(selectedPlan?.features ?? []).map(feature => <li key={feature}><Check size={16}/>{feature}</li>)}</ul><p>Core traffic analytics remain available without a subscription. Premium tools unlock only after verified payment.</p></div>

      <section className="rl-billing-checkout rl-billing-checkout-ready">
        <div className="rl-billing-checkout-icon"><CreditCard size={21}/></div>
        <div className="rl-billing-checkout-content">
          <h2>Choose a payment provider</h2>
          {loading ? <p>Checking which secure providers are configured…</p> : gateways.length ? <div className="rl-billing-gateways">{gateways.map(item => <label key={item.id} className={`rl-billing-gateway${gateway === item.id ? " selected" : ""}`}><input type="radio" name="subscription-gateway" value={item.id} checked={gateway === item.id} onChange={() => setGateway(item.id)}/><span><strong>{item.name}</strong><small>{item.currency} · {item.description}</small></span></label>)}</div> : <p>No subscription payment provider is configured yet. The owner must finish merchant credentials, webhook verification and HTTPS app URL setup before checkout can accept payment.</p>}
          {gateways.length > 0 && <p className="rl-billing-method-note">The secure checkout shows payment methods enabled for this merchant and your location, such as cards, UPI or wallets where available. RankLens records only the method and payer details returned by the provider; availability and returned details can vary.</p>}
        </div>
        <button type="button" disabled={loading || busy || quoteLoading || !providerQuote || gateways.length === 0 || !gateway || !validDays} onClick={() => void startCheckout()}>
          {busy ? <><LoaderCircle size={16} className="rl-spin"/> Preparing secure checkout…</> : <><CreditCard size={16}/> Continue to payment</>}
        </button>
      </section>
      <p className="rl-billing-security"><ShieldCheck size={15}/> Access is granted only after the payment provider confirms a captured payment. Closing checkout or returning from it does not count as payment.</p>
      <p className="rl-billing-renewal-note">Purchases made before your current plan expires are added after the remaining access period. Placement markup is saved with each verified purchase and applies only during its active period.</p>
      <Link href="/feedback" className="rl-billing-contact">Contact the owner about a billing question</Link>

      <section className="rl-billing-orders"><h2>Recent subscription checkouts</h2>{loading ? <p>Loading order history…</p> : orders.length ? <div className="rl-billing-order-list">{orders.map(order=><article key={order.id}><div><strong>{order.planLabel} · {order.durationDays} {order.durationDays === 1 ? "day" : "days"}</strong><small>{new Date(order.createdAt).toLocaleString()} · {order.gateway}</small><small>Payer: {order.payerName || "Not returned by provider"}{order.payerNameSource && ` · ${order.payerNameSource === "provider" ? "Provider-reported" : "Entered by payer"}`} · Method: {formatProviderPaymentMethod({ payment_method_type: order.paymentMethodType, payment_method_brand: order.paymentMethodBrand, payment_method_last4: order.paymentMethodLast4, payment_wallet: order.paymentWallet })}</small></div><span>{money(order.chargeAmount / 100, order.chargeCurrency)} <b className={`status-${order.status}`}>{order.status}</b></span>{order.status === "pending" ? <button type="button" disabled={busy} onClick={() => void checkOrder(order.id, 4)}>Check status</button> : <div className="rl-billing-order-actions">{order.status === "completed" && <Link href={`/api/analytics/subscription/${encodeURIComponent(order.id)}/receipt`} className="rl-billing-receipt" target="_blank" rel="noreferrer">Download PDF receipt</Link>}<button type="button" disabled={busy} onClick={() => void checkOrder(order.id, 1)}>Refresh details</button></div>}</article>)}</div> : <p>No subscription checkouts yet.</p>}</section>
    </div>
  </main>;
}
