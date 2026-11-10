import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, LockKeyhole, MessageCircle } from "lucide-react";
import { getSessionFromCookieHeader } from "@/lib/auth";
import { getOwnedAnalyticsSite } from "@/lib/analytics-sites";
import { hasAnalyticsBotAccess } from "@/lib/analytics-plan";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import AnalyticsBotTraffic from "@/components/AnalyticsBotTraffic";
import AnalyticsSiteShareButton from "@/components/AnalyticsSiteShareButton";
import RankBidMark from "@/components/RankBidMark";
export const dynamic="force-dynamic";
export async function generateMetadata(){return {title:"Website analytics"};}
export default async function AnalyticsSitePage({params}:{params:Promise<{siteId:string}>}){
  const {siteId}=await params,user=getSessionFromCookieHeader((await cookies()).toString());if(!user)redirect("/login?next="+encodeURIComponent(`/datafast/dashboard/sites/${siteId}`));
  const site=getOwnedAnalyticsSite(user.id,siteId);if(!site)notFound();
  const canViewBotTraffic=hasAnalyticsBotAccess(user.id);
  return <main className="rl-site-dashboard"><header className="rl-site-dashboard-nav"><Link href="/datafast" className="rl-brand" aria-label="RankLens front page"><i><RankBidMark size={22}/></i>RankLens</Link><div><Link href="/datafast/dashboard" className="rl-secondary"><ArrowLeft size={15}/>Websites</Link><AnalyticsSiteShareButton siteId={site.id} enabled={site.share_enabled===1}/></div></header>
    <div className="rl-site-dashboard-title"><div><span>Website</span><h1>{site.domain}</h1><p>Timezone: {site.timezone} · aggregate country totals only</p></div><div className="rl-site-actions"><Link className="rl-secondary" href={`/datafast/dashboard/new?step=script&siteId=${encodeURIComponent(site.id)}`}>Tracking code</Link>{canViewBotTraffic&&<a className="rl-secondary" href={`/api/analytics/sites/${encodeURIComponent(site.id)}/export?days=30`}><Download size={14}/>Export CSV</a>}</div></div>
    <AnalyticsDashboard reportUrl={`/api/analytics/sites/${encodeURIComponent(site.id)}/report`} timezone={site.timezone}/>
    {canViewBotTraffic ? <><AnalyticsBotTraffic siteId={site.id} domain={site.domain}/><section className="rl-bot-card"><header className="rl-bot-heading"><div><span className="rl-bot-icon"><MessageCircle size={18}/></span><div><h2>Private owner support</h2><p>Ask the owner about your RankLens account or analytics setup.</p></div></div></header><div className="rl-bot-empty"><Link className="rl-secondary" href="/messages">Open private messages</Link></div></section></> : <section className="rl-bot-card" aria-labelledby="rl-bot-plan-title"><header className="rl-bot-heading"><div><span className="rl-bot-icon"><LockKeyhole size={18}/></span><div><h2 id="rl-bot-plan-title">RankLens Pro features</h2><p>Premium tools include bot traffic reports, CSV export, up to 20 websites and private owner support.</p></div></div></header><div className="rl-bot-empty"><strong>Paid access is not active</strong><span>Your current dashboard remains available. Visit Billing to view plans and request access.</span><Link className="rl-secondary" href="/datafast/dashboard/billing">View plans</Link></div></section>}
  </main>;
}
