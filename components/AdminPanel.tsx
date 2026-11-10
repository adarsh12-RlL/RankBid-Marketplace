import RazorpayStatus from "./RazorpayStatus";
import StripeRecipientStatus from "./StripeRecipientStatus";

import AdminFeedback from "./AdminFeedback";

import AdminAnalyticsPlanAccess from "./AdminAnalyticsPlanAccess";
import AdminPromotionStudio from "./AdminPromotionStudio";
import AdminMessageModeration from "./AdminMessageModeration";
import MessageCenter from "./MessageCenter";

import { cookies } from "next/headers";

import { redirect } from "next/navigation";

import Link from "next/link";

import Header from "./Header";

import Footer from "./Footer";

import { AdminPasswordForm, Moderate, SettingsForm } from "./AdminControls";

import getDb from "@/lib/db";

import { AUTH_COOKIE_NAME, getSessionFromToken, isOwner } from "@/lib/auth";

import AdminAccountManagement from "./AdminAccountManagement";
import PayoutAccountSettings from "./PayoutAccountSettings";

import { stats, isTestMode, getPaymentMode, getProducts } from "@/lib/ranking";

export default async function AdminPanel({ section }: { section: string }) {

  const u = getSessionFromToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);

  if (!u) redirect("/login?next=/admin/" + section);

  if (u.role !== "admin")

    return (

      <>

        <Header />

        <main className="max-w-3xl mx-auto p-8">

          <h1 className="text-xl font-bold">Administrator access required</h1>

          <p className="mt-4">

            Your current account does not have this permission.

          </p>

          <Link href="/dashboard" className="inline-block mt-4 underline">

            Back to my listings

          </Link>

        </main>

      </>

    );

  const owner = isOwner(u);
  if (["admins", "security", "users", "payouts", "promotions", "settings"].includes(section) && !owner)
    return (
      <>
        <Header />
        <main className="max-w-3xl mx-auto p-8">
          <h1 className="text-xl font-bold">Owner access required</h1>
          <p className="mt-4">Only the owner can view administrator accounts, customer access controls, payment and plan settings, and the admin activity log.</p>
          <Link href="/admin" className="inline-block mt-4 underline">Back to admin dashboard</Link>
        </main>
        <Footer />
      </>
    );

  const db = getDb(),

    s = stats();

  const promotionBoards = section === "promotions" ? {
    today: getProducts({ board: "today", limit: 20 }).products.map(({ name, domain, category, amount_paid, rank_position }) => ({ name, domain, category, amount_paid, rank_position })),
    allTime: getProducts({ board: "all_time", limit: 20 }).products.map(({ name, domain, category, amount_paid, rank_position }) => ({ name, domain, category, amount_paid, rank_position })),
  } : null;

  const products = db

    .prepare(

      "SELECT id,name,domain,is_active,is_approved FROM products WHERE is_demo=? AND owner_id IS NOT NULL ORDER BY id DESC LIMIT 100",

    )

    .all(isTestMode() ? 1 : 0) as any[];

  const transactions = db

    .prepare(

      "SELECT pay.id,pay.amount_cents/100.0 AS amount,pay.status,pay.created_at,p.name FROM payments pay LEFT JOIN products p ON p.id=pay.product_id WHERE pay.is_test=? ORDER BY pay.id DESC LIMIT 100",

    )

    .all(isTestMode() ? 1 : 0) as any[];

  const logs =

    section === "security"

      ? (db

          .prepare(

            "SELECT actor_email,action,target_id,target_label,created_at FROM audit_logs ORDER BY id DESC LIMIT 250",

          )

          .all() as any[])

      : [];

  return (

    <>

      <Header />

      <main className="max-w-6xl mx-auto p-4 py-8">

        <nav

          aria-label="Admin navigation"

          className="flex flex-wrap gap-4 text-sm mb-8"

        >

          {[

            "dashboard",

            "revenue",

            "products",

            "users",

            "admins",

            "transactions",

            "feedback",
            "messages",

            "analytics",

            "settings",

            "payouts",

            "promotions",

            "security",

          ].filter((p) => owner || !["users", "security", "admins", "payouts", "promotions", "settings"].includes(p)).map((p) => (

            <Link

              key={p}

              href={"/admin/" + p}

              className={

                section === p ? "font-bold text-[#FF6B4A]" : "underline"

              }

            >

              {p}

            </Link>

          ))}

        </nav>

        <h1 className="text-2xl font-bold capitalize">Admin · {section}</h1>

        {section === "feedback" ? (
          <p className="text-sm text-gray-500 my-4">
            Private customer messages, saved replies, and public review moderation.
          </p>
        ) : section === "users" ? (
          <p className="text-sm text-gray-500 my-4">
            Verify payment with the provider before activating RankLens bot traffic access for a customer.
          </p>
        ) : (
          <p className="text-sm text-gray-500 my-4">
            Payment mode: {getPaymentMode()}.{" "}
            {s.isTest
              ? "All amounts below are test volume; no real funds moved."
              : "Recorded charges exclude refunds and are before provider fees. Bank payouts are managed by your payment provider."}
          </p>
        )}

        {["dashboard", "revenue", "analytics"].includes(section) && (

          <>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 my-8">

              {[

                [

                  s.isTest ? "Test volume" : "Recorded payments",

                  "$" + s.totalRevenue.toFixed(2),

                ],

                ["Verified placements", s.totalProducts],

                ["Recorded outbound clicks", s.totalClicks],

              ].map(([label, value]) => (

                <div

                  key={label}

                  className="border dark:border-gray-800 rounded-xl p-5"

                >

                  <p className="text-sm text-gray-500">{label}</p>

                  <p className="text-2xl font-semibold mt-2">{value}</p>

                </div>

              ))}

            </div>

            <h2 className="font-semibold mb-3">

              Recent daily payment totals (UTC)

            </h2>

            {s.weekStats.map((r: any) => (

              <p key={r.date} className="py-2 border-b dark:border-gray-800">

                {r.date} · ${Number(r.revenue).toFixed(2)}

              </p>

            ))}

            {!s.weekStats.length && <p>No verified payment records yet.</p>}

          </>

        )}

        {section === "products" && (

          <div className="space-y-4">

            {products.map((p) => (

              <div

                key={p.id}

                className="border dark:border-gray-800 p-4 rounded-lg flex justify-between gap-4 flex-wrap"

              >

                <div>

                  <strong>{p.name}</strong>

                  <p className="text-sm text-gray-500">

                    {p.domain} · {p.is_approved ? "Approved" : "Pending review"}{" "}

                    · {p.is_active ? "Active" : "Hidden"}

                  </p>

                </div>

                <Moderate

                  id={p.id}

                  approved={!!p.is_approved}

                  active={!!p.is_active}

                />

              </div>

            ))}

            {!products.length && (

              <p>No account-owned submissions in this environment.</p>

            )}

          </div>

        )}

        {section === "transactions" && (

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead>

                <tr>

                  <th className="p-3">Product</th>

                  <th>Amount</th>

                  <th>Status</th>

                  <th>Date</th>

                </tr>

              </thead>

              <tbody>

                {transactions.map((t) => (

                  <tr key={t.id} className="border-t dark:border-gray-800">

                    <td className="p-3">{t.name}</td>

                    <td>${Number(t.amount).toFixed(2)}</td>

                    <td>{t.status}</td>

                    <td>{t.created_at}</td>

                  </tr>

                ))}

              </tbody>

            </table>

            {!transactions.length && <p>No payments yet.</p>}

          </div>

        )}

        {section === "users" && <><AdminAnalyticsPlanAccess />{owner && <AdminMessageModeration />}</>}
        {section === "messages" && <MessageCenter isAdmin />}

        {section === "admins" && <AdminAccountManagement />}

        {section === "payouts" && <PayoutAccountSettings stripeConfigured={Boolean(process.env.STRIPE_SECRET_KEY)} razorpayConfigured={Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)} />}

        {section === "promotions" && promotionBoards && <AdminPromotionStudio today={promotionBoards.today} allTime={promotionBoards.allTime} testMode={isTestMode()} />}

        {section === "security" && (

          <>

            {logs.map((x, i) => (

              <div

                key={i}

                className="border-b dark:border-gray-800 py-3 text-sm"

              >

                {x.created_at} · {x.actor_email || "Unknown administrator"} · {x.action} · {x.target_label || x.target_id}

              </div>

            ))}

            {!logs.length && <p>No recorded admin or account actions yet.</p>}

          </>

        )}

        {section === "settings" && <>{owner && <Link href="/admin/payouts" className="inline-flex items-center gap-2 rounded-lg border px-4 py-3 my-3 text-sm font-semibold hover:border-[#FF6B4A]">Manage payout accounts <span aria-hidden="true">→</span></Link>}<StripeRecipientStatus /><RazorpayStatus /><SettingsForm /><AdminPasswordForm /></>}

        {section === "feedback" && <AdminFeedback />}

      </main>

      <Footer />

    </>

  );

}

