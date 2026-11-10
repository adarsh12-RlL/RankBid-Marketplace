import Link from "next/link";
import { ArrowLeft, ArrowRight, Handshake, ShieldCheck } from "lucide-react";
import RankBidMark from "@/components/RankBidMark";
export const metadata = { title: "Partner program" };
export default function Page() {
  return <main className="rl-account-page"><header className="rl-account-header"><Link href="/datafast" className="rl-brand"><i><RankBidMark size={22}/></i>RankLens</Link><Link href="/datafast" className="rl-account-back"><ArrowLeft size={15}/>RankLens home</Link></header>
    <section className="rl-account-hero"><span className="rl-doc-eyebrow"><Handshake size={14}/> PARTNER PROGRAM</span><h1>Grow with RankLens.</h1><p>We are preparing a partner program with clear referral rules, attribution, and payout terms.</p>
      <article className="rl-status-card"><ShieldCheck size={20}/><div><strong>Partner enrollment is not enabled yet</strong><p>This local build has no affiliate tracking, commission ledger, or partner payouts. No referral is being created and no payment will be sent from this page.</p></div></article>
      <div className="rl-account-actions"><Link href="/feedback" className="rl-account-primary">Ask about partner access <ArrowRight size={16}/></Link><Link href="/datafast/docs/partners" className="rl-account-secondary">Watch the overview</Link></div>
    </section>
  </main>;
}
