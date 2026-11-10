import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import getDb from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, CreditCard, Settings2, Users, UserRoundCog } from "lucide-react";
import { AUTH_COOKIE_NAME, getSessionFromToken, isOwner } from "@/lib/auth";
import { hasAnalyticsBotAccess, ensureAnalyticsPlanSchema, listAnalyticsPlans } from "@/lib/analytics-plan";
import RankLensBillingClient from "@/components/RankLensBillingClient";
export const dynamic = "force-dynamic";
export const metadata = { title: "Billing" };
export default async function Page({ searchParams }: { searchParams: Promise<{ plan?: string; payment?: string; order_id?: string }> }) {
  const user = getSessionFromToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!user) redirect("/login?next=/datafast/dashboard/billing");
  ensureAnalyticsPlanSchema();
  if (user.role === "admin") {
    const plans = listAnalyticsPlans();
    const owner = isOwner(user);
    return <main className="rl-billing-page">
      <div className="rl-billing-shell">
        <Link href="/datafast/dashboard" className="rl-billing-back"><ArrowLeft size={15}/>RankLens dashboard</Link>
        <header className="rl-billing-heading">
          <span className="rl-doc-eyebrow">ADMIN BILLING</span>
          <h1>Plans and billing overview</h1>
          <p>Administrator accounts do not buy customer plans. Use this page to review the customer plan prices and durations. A customer plan becomes active only after the payment provider confirms payment.</p>
        </header>
        <section className="rl-admin-billing-plans" aria-label="Customer plans">
          {plans.map((plan) => <article className="rl-admin-billing-plan" key={plan.id}>
            <span>{plan.label}</span>
            <strong>${plan.price.toFixed(2)} <small>/ {plan.days} days</small></strong>
            <p>{plan.markupPercent}% RankBid placement markup while the plan is active.</p>
          </article>)}
        </section>
        <p className="rl-admin-billing-note"><CreditCard size={17}/>This overview does not create a payment, move money, or grant access. Payment credentials and bank payouts are managed through the configured payment provider.</p>
        {owner ? <section className="rl-admin-billing-actions" aria-label="Owner controls">
          <Link href="/admin/settings"><Settings2 size={18}/><span><strong>Plan and payment settings</strong><small>Update customer prices, default durations and markups.</small></span></Link>
          <Link href="/admin/users"><Users size={18}/><span><strong>Customer access</strong><small>Review and manage paid RankLens access.</small></span></Link>
          <Link href="/admin/admins"><UserRoundCog size={18}/><span><strong>Administrator accounts</strong><small>Create or manage normal admin accounts.</small></span></Link>
        </section> : <p className="rl-admin-billing-note">Only the owner administrator can change plans, manage customer access, or create administrator accounts.</p>}
      </div>
    </main>;
  }
  const access = getDb().prepare("SELECT expires_at FROM analytics_bot_plan_access WHERE user_id=?").get(user.id) as { expires_at: string } | undefined;
  const params = await searchParams;
  const requestedPlan = params.plan;
  const initialPlan = requestedPlan === "day" || requestedPlan === "monthly" || requestedPlan === "yearly" ? requestedPlan : "monthly";
  const paymentResult = params.payment === "success" || params.payment === "cancelled" ? params.payment : undefined;
  const orderId = typeof params.order_id === "string" && /^[0-9a-f-]{36}$/i.test(params.order_id) ? params.order_id : undefined;
  return <RankLensBillingClient email={user.email} botAccess={hasAnalyticsBotAccess(user.id)} expiresAt={access?.expires_at || null} initialPlan={initialPlan} plans={listAnalyticsPlans()} paymentResult={paymentResult} orderId={orderId}/>;
}
