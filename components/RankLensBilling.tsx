"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, CreditCard, ShieldCheck } from "lucide-react";
import type { MarketingPlan } from "@/components/RankLensMarketing";

type PlanId = "day" | "monthly" | "yearly";
type RankLensBillingProps = {
  email: string;
  botAccess: boolean;
  expiresAt: string | null;
  initialPlan: PlanId;
  plans: MarketingPlan[];
};

const MAX_DAYS = 3660;
const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);

export default function RankLensBilling({ email, botAccess, expiresAt, initialPlan, plans }: RankLensBillingProps) {
  const initial = plans.find(plan => plan.id === initialPlan) ?? plans[0];
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>((initial?.id as PlanId) || "monthly");
  const [durationDays, setDurationDays] = useState(initial?.days ?? 30);
  const [inputValue, setInputValue] = useState(String(initial?.days ?? 30));
  const selectedPlan = plans.find(plan => plan.id === selectedPlanId) ?? initial;
  const validDays = Number.isInteger(durationDays) && durationDays >= 1 && durationDays <= MAX_DAYS;
  const quotedCents = useMemo(() => {
    if (!selectedPlan || !validDays) return 0;
    return Math.max(100, Math.round((selectedPlan.price / selectedPlan.days) * durationDays * 100));
  }, [selectedPlan, validDays, durationDays]);

  function selectPlan(plan: MarketingPlan) {
    setSelectedPlanId(plan.id as PlanId);
    setDurationDays(plan.days);
    setInputValue(String(plan.days));
  }

  function changeDays(value: string) {
    setInputValue(value);
    setDurationDays(/^\d+$/.test(value) ? Number(value) : 0);
  }

  return <main className="rl-billing-page">
    <div className="rl-billing-shell">
      <Link href="/datafast" className="rl-billing-back"><ArrowLeft size={16}/> Back to RankLens</Link>
      <header className="rl-billing-heading">
        <span className="lens-eyebrow">CUSTOMER SUBSCRIPTION</span>
        <h1>Choose your RankLens plan</h1>
        <p>Signed in as <strong>{email}</strong>. Choose a starting rate and set the exact number of days you need.</p>
      </header>

      {botAccess && <div className="rl-billing-active" role="status"><Check size={18}/><div><strong>Premium access is active</strong><p>{expiresAt ? `Current access ends ${new Date(expiresAt).toLocaleString()}.` : "Your premium features are available."}</p></div></div>}

      <section className="rl-billing-plans" aria-label="Available plans">
        {plans.map(plan => <button type="button" key={plan.id} className={`rl-billing-plan${selectedPlanId === plan.id ? " selected" : ""}`} aria-pressed={selectedPlanId === plan.id} onClick={() => selectPlan(plan)}>
          <span className="rl-billing-plan-top"><span>{plan.label}</span>{selectedPlanId === plan.id && <Check size={17}/>}</span>
          <strong>{money(plan.price)}<small> / {plan.days} {plan.days === 1 ? "day" : "days"}</small></strong>
          <span className="rl-billing-plan-copy">{plan.features.slice(0, 2).join(" · ")}</span>
        </button>)}
      </section>

      <section className="rl-billing-summary">
        <div className="rl-billing-days">
          <label htmlFor="subscription-days"><CalendarDays size={17}/> Subscription duration</label>
          <div className="rl-billing-days-input"><input id="subscription-days" type="number" min={1} max={MAX_DAYS} step={1} inputMode="numeric" value={inputValue} onChange={event => changeDays(event.target.value)} aria-describedby="subscription-days-help"/><span>{Number(inputValue) === 1 ? "day" : "days"}</span></div>
          <small id="subscription-days-help">Choose any duration from 1 to {MAX_DAYS} days.</small>
        </div>
        <div className="rl-billing-price"><span>Estimated total</span><strong>{validDays ? money(quotedCents / 100) : "—"}</strong><small>Based on the selected plan’s daily rate. Minimum charge: $1.00.</small></div>
      </section>

      <div className="rl-billing-feature-list"><h2>Included with premium access</h2><ul>{(selectedPlan?.features ?? []).map(feature => <li key={feature}><Check size={16}/>{feature}</li>)}</ul></div>

      <section className="rl-billing-checkout" aria-live="polite">
        <div className="rl-billing-checkout-icon"><CreditCard size={21}/></div>
        <div><h2>Secure checkout is not available yet</h2><p>The payment provider and verified payment webhook have not been connected for subscriptions. No payment can be collected and access will not activate from this page yet.</p></div>
        <button type="button" disabled><CreditCard size={16}/> Checkout unavailable</button>
      </section>
      <p className="rl-billing-security"><ShieldCheck size={15}/> Your plan access will only activate after a payment is verified by the payment provider.</p>
      <Link href="/feedback" className="rl-billing-contact">Contact the owner about subscription availability</Link>
    </div>
  </main>;
}
