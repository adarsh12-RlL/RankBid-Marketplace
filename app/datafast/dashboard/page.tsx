import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, ChevronDown, CreditCard, Plus, Settings2, ShieldCheck, UserRoundCog, Shield, LayoutDashboard } from "lucide-react";
import { AUTH_COOKIE_NAME, getSessionFromToken, isOwner } from "@/lib/auth";
import { listAnalyticsSites } from "@/lib/analytics-sites";
import AnalyticsGlobe from "@/components/AnalyticsGlobe";
import RankBidMark from "@/components/RankBidMark";
import RankLensHomeLink from "@/components/RankLensHomeLink";
export const dynamic = "force-dynamic";
export const metadata={title:"Websites"};
export default async function AnalyticsWebsites(){
  const user=getSessionFromToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);if(!user)redirect("/login?next=/datafast/dashboard");
  const sites=listAnalyticsSites(user.id),displayName=user.email.split("@")[0]||"Account";
  return <main className="rl-workspace"><AnalyticsGlobe/><header className="rl-workspace-nav"><Link className="rl-brand" href="/datafast"><i><RankBidMark size={22}/></i>RankLens</Link><details className="rl-account-menu"><summary className="rl-account rl-account-summary"><b>{displayName.slice(0,1).toUpperCase()}</b><span className="rl-account-copy"><strong>{displayName}</strong><small>Customer ID: {user.id}</small></span><ChevronDown size={15} aria-hidden="true"/></summary><nav className="rl-account-menu-panel" aria-label="Account menu"><Link href="/datafast/dashboard/new"><Plus size={15}/>Website</Link><Link href="/datafast/dashboard/billing"><CreditCard size={15}/>Billing</Link><Link href="/datafast/dashboard/settings"><Settings2 size={15}/>Settings</Link><Link href="/datafast/docs/getting-started"><BookOpen size={15}/>Guide</Link><Link href="/dashboard"><LayoutDashboard size={15}/>Marketplace Portal</Link>{isOwner(user)&&<a href="https://rankbid-official.vercel.app/admin" target="_blank" rel="noopener noreferrer"><Shield size={15}/>Official Admin Center ↗</a>}{isOwner(user)&&<Link href="/admin/admins"><UserRoundCog size={15}/>Admin Accounts</Link>}</nav></details></header>
    <div className="rl-workspace-main"><div className="rl-workspace-actions"><RankLensHomeLink />{isOwner(user)&&<Link className="rl-admin-account-link" href="/admin/admins"><UserRoundCog size={15}/>Admin accounts</Link>}</div>
      <div className="rl-site-grid">{sites.map(site=><Link className="rl-site-card" href={`/datafast/dashboard/sites/${encodeURIComponent(site.id)}`} key={site.id}>
        <div className="rl-site-title"><i>{site.domain.slice(0,1).toUpperCase()}</i><strong>{site.domain}</strong></div><div className="rl-site-spark"><svg viewBox="0 0 300 55" preserveAspectRatio="none" aria-hidden="true"><path d={Number(site.visitors)>0?"M1 47 C40 42 48 46 82 38 S121 46 154 31 191 36 225 22 261 27 299 7":"M1 46 L299 46"}/></svg></div>
        <p><strong>{Number(site.visitors)||0}</strong> visitors <small>· last 30 days</small></p></Link>)}</div>
      {!sites.length&&<section className="rl-empty-sites"><h1>Your analytics dashboard is ready</h1><p>Add your first website, install its unique tracking snippet, and its real visits will appear here.</p><p className="rl-empty-sites-hint">“Add website” creates an analytics workspace under this signed-in account. It does not create a customer login or an admin ID.</p><Link className="rl-primary" href="/datafast/dashboard/new"><Plus size={16}/>Add website</Link></section>}
      <div className="rl-workspace-safety"><ShieldCheck size={17}/><span>Tracking scripts do not request browser location. RankBid map sharing is one-time, optional and rounded to about 10 km for up to 24 hours. Raw IPs and exact coordinates are not stored.</span></div>
      <Link className="rl-workspace-public" href="/stats">Open RankBid public analytics →</Link>
    </div>
  </main>;
}
