import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";
import RankLensRazorpayCheckout from "@/components/RankLensRazorpayCheckout";

export const dynamic = "force-dynamic";
export const metadata = { title: "Secure RankLens Pro checkout" };

export default async function Page({ searchParams }: { searchParams: Promise<{ order_id?: string }> }) {
  const user = getSessionFromToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!user) redirect("/login?next=/datafast/dashboard/billing");
  if (user.role === "admin") redirect("/datafast/dashboard");

  const params = await searchParams;
  const orderId = typeof params.order_id === "string" && /^[0-9a-f-]{36}$/i.test(params.order_id)
    ? params.order_id
    : "";

  if (orderId) return <RankLensRazorpayCheckout orderId={orderId} />;

  return <main className="rl-billing-page">
    <div className="rl-billing-shell rl-provider-checkout">
      <section className="rl-provider-card" aria-live="polite">
        <span className="lens-eyebrow">SECURE PROVIDER CHECKOUT</span>
        <h1>Complete your RankLens Pro payment</h1>
        <p>This checkout link is missing a valid order reference.</p>
        <Link href="/datafast/dashboard/billing" className="rl-provider-secondary">Return to billing</Link>
      </section>
    </div>
  </main>;
}
