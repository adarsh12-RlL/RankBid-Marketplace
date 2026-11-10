import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MessageCenter from "@/components/MessageCenter";
import { AUTH_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";
import { hasAnalyticsBotAccess } from "@/lib/analytics-plan";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = getSessionFromToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!user) redirect("/login?next=/messages");
  const allowed = user.role === "admin" || hasAnalyticsBotAccess(user.id);

  return <>
    <Header />
    <main className="messages-page-shell">
      {allowed ? <MessageCenter isAdmin={user.role === "admin"} /> : <section className="messages-premium-gate">
        <span className="message-center-kicker">RANKLENS PRO</span>
        <h1>Private owner support</h1>
        <p>RankLens Pro members can send private messages to the owner and share images or videos up to 20 MB. Your conversation is visible only to you and the owner.</p>
        <Link href="/datafast/dashboard/billing">View plans and billing <span aria-hidden="true">→</span></Link>
      </section>}
    </main>
    <Footer />
  </>;
}
