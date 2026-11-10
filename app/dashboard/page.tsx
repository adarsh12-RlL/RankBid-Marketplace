import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, ArrowUpRight, BadgeCheck, CreditCard, MousePointer2, Package } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CustomerDashboardChart, { type CustomerDailyMetric } from "@/components/CustomerDashboardChart";
import { listAnalyticsSites } from "@/lib/analytics-sites";
import getDb from "@/lib/db";
import { AUTH_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";
import { totalCents, isTestMode } from "@/lib/ranking";
import { formatProviderPaymentMethod } from "@/lib/payment-details";

export const dynamic = "force-dynamic";

function dateLabel(value: string) {
  const parsed = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Calcutta" }).format(parsed);
}

function paymentAmountLabel(payment: Record<string, any>) {
  const currency = String(payment.presentment_currency || payment.charge_currency || "usd").toUpperCase();
  const minor = Number(payment.presentment_amount ?? payment.charge_amount ?? payment.amount_cents);
  if (!/^[A-Z]{3}$/.test(currency) || !Number.isSafeInteger(minor) || minor < 0) return "Unavailable";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

export default async function Dashboard() {
  const u = getSessionFromToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!u) redirect("/login?next=/dashboard");

  const db = getDb();
  const testMode = isTestMode() ? 1 : 0;
  const analyticsSites = listAnalyticsSites(u.id, db);
  const products = db.prepare(`
    SELECT p.*, COUNT(c.id) AS dashboard_clicks
    FROM products p LEFT JOIN clicks c ON c.product_id=p.id AND c.ip_address LIKE 'v2:%'
    WHERE p.owner_id=? AND p.is_demo=?
    GROUP BY p.id ORDER BY p.id DESC
  `).all(u.id, testMode) as any[];
  const payments = db.prepare(`
    SELECT pay.id,pay.product_id,pay.amount_cents,pay.refunded_cents,pay.status,pay.verified,
      pay.created_at,pay.confirmed_at,pay.payer_name,pay.payer_name_source,pay.payment_method_type,pay.payment_method_brand,
      pay.payment_method_last4,pay.payment_wallet,pay.presentment_currency,pay.presentment_amount,
      pay.charge_currency,pay.charge_amount,p.name AS product_name
      FROM payments pay LEFT JOIN products p ON p.id=pay.product_id
    WHERE pay.user_id=? AND pay.is_test=? ORDER BY pay.id DESC LIMIT 100
  `).all(u.id, testMode) as any[];
  const totals = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN verified=1 AND status='completed' AND amount_cents>refunded_cents
      THEN amount_cents-refunded_cents ELSE 0 END),0) AS verified_spend_cents,
      SUM(CASE WHEN verified=1 AND status='completed' AND amount_cents>refunded_cents THEN 1 ELSE 0 END) AS verified_payments,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending_payments
    FROM payments WHERE user_id=? AND is_test=?
  `).get(u.id, testMode) as any;
  const clickTotal = db.prepare(`
    SELECT COUNT(*) AS total FROM clicks c JOIN products p ON p.id=c.product_id
    WHERE p.owner_id=? AND p.is_demo=? AND c.ip_address LIKE 'v2:%'
  `).get(u.id, testMode) as { total: number };

  const today = new Date();
  const rangeEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
  const rangeStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 13));
  const from = rangeStart.toISOString();
  const to = rangeEnd.toISOString();
  const spendRows = db.prepare(`
    SELECT date(confirmed_at) AS day, SUM(amount_cents-refunded_cents) AS spend_cents
    FROM payments
    WHERE user_id=? AND is_test=? AND verified=1 AND status='completed'
      AND amount_cents>refunded_cents AND confirmed_at IS NOT NULL
      AND julianday(confirmed_at)>=julianday(?) AND julianday(confirmed_at)<julianday(?)
    GROUP BY date(confirmed_at)
  `).all(u.id, testMode, from, to) as { day: string; spend_cents: number }[];
  const clickRows = db.prepare(`
    SELECT date(c.created_at) AS day, COUNT(*) AS clicks
    FROM clicks c JOIN products p ON p.id=c.product_id
    WHERE p.owner_id=? AND p.is_demo=? AND c.ip_address LIKE 'v2:%'
      AND julianday(c.created_at)>=julianday(?) AND julianday(c.created_at)<julianday(?)
    GROUP BY date(c.created_at)
  `).all(u.id, testMode, from, to) as { day: string; clicks: number }[];
  const spendByDay = new Map(spendRows.map((row) => [row.day, Number(row.spend_cents) || 0]));
  const clicksByDay = new Map(clickRows.map((row) => [row.day, Number(row.clicks) || 0]));
  const chartMetrics: CustomerDailyMetric[] = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(rangeStart.getTime() + index * 86_400_000).toISOString().slice(0, 10);
    return { date, spendCents: spendByDay.get(date) ?? 0, clicks: clicksByDay.get(date) ?? 0 };
  });

  const feed = [
    ...products.map((product) => ({
      id: `listing-${product.id}`, createdAt: String(product.created_at), kind: "listing" as const,
      title: "Product submitted", detail: `${product.name} · ${product.domain || "Website pending"}`,
      status: product.is_active ? "In your listings" : "Hidden",
    })),
    ...payments.map((payment) => {
      const confirmed = payment.verified === 1 && payment.status === "completed";
      const title = confirmed ? "Payment confirmed" : payment.status === "failed" ? "Payment attempt failed" : payment.status === "refunded" ? "Payment refunded" : payment.status === "disputed" ? "Payment disputed" : "Payment update";
      return {
        id: `payment-${payment.id}`, createdAt: String(confirmed && payment.confirmed_at ? payment.confirmed_at : payment.created_at), kind: "payment" as const,
        title, detail: `${payment.product_name || "Product placement"} · $${(payment.amount_cents / 100).toFixed(2)}`,
        status: confirmed ? "Verified" : payment.status,
      };
    }),
  ].sort((a, b) => new Date(b.createdAt.includes("T") ? b.createdAt : `${b.createdAt.replace(" ", "T")}Z`).getTime() - new Date(a.createdAt.includes("T") ? a.createdAt : `${a.createdAt.replace(" ", "T")}Z`).getTime()).slice(0, 8);

  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(totals.verified_spend_cents || 0) / 100);

  return (
    <div className="rankbid-page">
      <Header />
      <main className="rankbid-page-main customer-dashboard">
        <section className="rankbid-page-heading customer-dashboard-heading">
          <div>
            <span className="rankbid-page-kicker">Customer workspace · {isTestMode() ? "Sandbox" : "Live"}</span>
            <h1>Account overview</h1>
            <p>{u.email} <span className="customer-id">Customer ID · {u.id}</span></p>
          </div>
          <div className="customer-dashboard-actions">
            <Link href="/submit" className="customer-primary-action">Submit a product <ArrowUpRight size={15} /></Link>
            {u.role === "admin" && <Link href="/admin/dashboard" className="customer-secondary-action">Admin dashboard</Link>}
          </div>
        </section>

        <section className="customer-kpi-grid" aria-label="Account summary">
          <article className="customer-kpi"><span className="customer-kpi-icon orange"><CreditCard size={17} /></span><span className="customer-kpi-label">Verified spend</span><strong>{money}</strong><small>{Number(totals.verified_payments || 0)} confirmed payments</small></article>
          <article className="customer-kpi"><span className="customer-kpi-icon blue"><Package size={17} /></span><span className="customer-kpi-label">Your products</span><strong>{products.length.toLocaleString()}</strong><small>{products.filter((product) => product.is_active && product.is_approved).length} approved and visible</small></article>
          <article className="customer-kpi"><span className="customer-kpi-icon blue"><MousePointer2 size={17} /></span><span className="customer-kpi-label">Recorded product clicks</span><strong>{Number(clickTotal.total || 0).toLocaleString()}</strong><small>On your listings · all time</small></article>
          <article className="customer-kpi"><span className="customer-kpi-icon orange"><Activity size={17} /></span><span className="customer-kpi-label">Payments in progress</span><strong>{Number(totals.pending_payments || 0).toLocaleString()}</strong><small>Waiting for provider confirmation</small></article>
        </section>

        <section className="customer-panel customer-performance-panel">
          <div className="customer-section-heading"><div><span className="rankbid-page-kicker">Your activity</span><h2>Performance</h2><p>Only recorded, account-owned activity is shown. Clicks are outbound clicks on your product listings.</p></div><span className="customer-period-pill">Last 14 days · UTC</span></div>
          <CustomerDashboardChart metrics={chartMetrics} />
        </section>

        <section className="customer-panel customer-sites-panel">
          <div className="customer-section-heading"><div><span className="rankbid-page-kicker"><Activity size={13} /> Website analytics</span><h2>Your traffic reports</h2><p>Private reports for websites connected to your account. Each report opens in its own page.</p></div><Link href="/datafast/dashboard/new" className="customer-secondary-action">Add website <ArrowUpRight size={14} /></Link></div>
          {analyticsSites.length ? <div className="customer-sites-grid">{analyticsSites.map((site) => <Link href={`/datafast/dashboard/sites/${encodeURIComponent(site.id)}`} key={site.id} className="customer-analytics-site">
            <span className="customer-analytics-site-icon">{site.domain.slice(0, 1).toUpperCase()}</span><span className="customer-analytics-site-copy"><strong>{site.domain}</strong><small>Last 30 days · {Number(site.visitors || 0).toLocaleString()} real visitors</small></span><ArrowUpRight size={16} />
          </Link>)}</div> : <div className="customer-empty customer-empty-compact customer-sites-empty"><Activity size={19} /><p>Add your website and install its tracking script to see real traffic, referrers, countries and devices here.</p><Link href="/datafast/dashboard/new">Set up website analytics <ArrowUpRight size={14} /></Link></div>}
        </section>

        <div className="customer-dashboard-lower">
          <section className="customer-panel">
            <div className="customer-section-heading"><div><span className="rankbid-page-kicker"><Package size={13} /> Portfolio</span><h2>Your products</h2></div><span className="customer-count-pill">{products.length} total</span></div>
            {products.length ? <div className="customer-product-list">{products.map((product) => {
              const allTime = totalCents(product.id) / 100;
              const status = !product.is_active ? "Hidden" : !product.is_approved ? "Awaiting review" : "Approved";
              return <article key={product.id} className="customer-product-card">
                <div className="customer-product-copy"><span className="customer-product-icon"><Package size={17} /></span><div><h3>{product.name}</h3><p>{product.domain} <span>·</span> {product.category || "Other"}</p></div></div>
                <div className="customer-product-metrics"><span><b>${allTime.toFixed(2)}</b><small>current board spend</small></span><span><b>{Number(product.dashboard_clicks || 0).toLocaleString()}</b><small>recorded clicks</small></span><span className="customer-product-status"><BadgeCheck size={14} />{status}</span></div>
                <Link href={`/submit?productId=${product.id}&board=all_time&price=${allTime + 1}`} className="customer-product-link">Increase placement <ArrowUpRight size={14} /></Link>
              </article>;
            })}</div> : <div className="customer-empty"><Package size={20} /><p>Your product submissions will appear here.</p><Link href="/submit">Submit your first product <ArrowUpRight size={14} /></Link></div>}
          </section>

          <section className="customer-panel customer-activity-panel">
            <div className="customer-section-heading"><div><span className="rankbid-page-kicker"><Activity size={13} /> Updates</span><h2>Recent activity</h2></div><span className="customer-count-pill">Latest {feed.length}</span></div>
            {feed.length ? <ol className="customer-activity-list">{feed.map((item) => <li key={item.id}>
              <span className={`customer-activity-icon ${item.kind}`} aria-hidden="true">{item.kind === "payment" ? <CreditCard size={14} /> : <Package size={14} />}</span>
              <div className="customer-activity-copy"><div><strong>{item.title}</strong><time>{dateLabel(item.createdAt)}</time></div><p>{item.detail}</p><span className={`customer-activity-status ${item.status === "Verified" ? "verified" : ""}`}>{item.status}</span></div>
            </li>)}</ol> : <div className="customer-empty customer-empty-compact"><Activity size={19} /><p>New product and payment updates will appear here.</p></div>}
          </section>
        </div>

        <section className="customer-panel customer-payment-panel">
          <div className="customer-section-heading"><div><span className="rankbid-page-kicker"><CreditCard size={13} /> Records</span><h2>Payment history</h2><p>Your payments for the current {isTestMode() ? "sandbox" : "live"} environment.</p></div><span className="customer-count-pill">{payments.length} recent</span></div>
          {payments.length ? <div className="customer-table-wrap"><table className="customer-payment-table"><thead><tr><th>Date</th><th>Product</th><th>Payer</th><th>Payment method</th><th>Amount paid</th><th>Status</th><th>Receipt</th></tr></thead><tbody>{payments.slice(0, 25).map((payment) => <tr key={payment.id}><td>{dateLabel(payment.created_at)}</td><td>{payment.product_name || "Product placement"}</td><td>{payment.payer_name || "Not returned by provider"}{payment.payer_name && <small className="block text-xs text-slate-500">{payment.payer_name_source === "provider" ? "Provider-reported" : payment.payer_name_source === "payer_entered" ? "Entered by payer" : "Name source unavailable"}</small>}</td><td>{formatProviderPaymentMethod({ payment_method_type: payment.payment_method_type, payment_method_brand: payment.payment_method_brand, payment_method_last4: payment.payment_method_last4, payment_wallet: payment.payment_wallet })}</td><td>{paymentAmountLabel(payment)}</td><td><span className={`customer-payment-status ${payment.verified === 1 && payment.status === "completed" ? "verified" : payment.status === "failed" ? "failed" : ""}`}>{payment.verified === 1 && payment.status === "completed" ? "Verified" : payment.status}</span></td><td>{payment.verified === 1 && payment.confirmed_at && ["completed", "refunded", "disputed"].includes(payment.status) ? <Link href={`/api/account/payments/${payment.id}/receipt`} target="_blank" rel="noreferrer">Download PDF</Link> : "Available after confirmation"}</td></tr>)}</tbody></table></div> : <div className="customer-empty customer-empty-compact"><CreditCard size={19} /><p>No payments yet. Payment records appear here after you start a checkout.</p></div>}
        </section>
      </main>
      <Footer />
    </div>
  );
}
