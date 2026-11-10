"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, ArrowRight, BarChart3, Check, ChevronDown, ExternalLink, MousePointer2, ShieldCheck } from "lucide-react";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import RankBidMark from "@/components/RankBidMark";
import PublicReviews from "@/components/PublicReviews";

export type MarketingPlan = { id: string; label: string; days: number; price: number; markupPercent?: number; currency: string; features: string[] };
type RankLensMarketingProps = { initialIsAdmin: boolean; initialPlans: MarketingPlan[] };

const faqs = [
  ["What does RankLens track?", "Anonymous page visits, referrers, campaigns, browsers and devices on the website you add. Its tracking script does not request browser location. RankBid's own realtime map separately offers one-time, optional approximate area sharing; other websites use country-only aggregates from a trusted proxy."],
  ["Can I open analytics without an account?", "Yes. RankBid’s public analytics page is available without signing in. The private website list and account data require Google sign-in."],
  ["How does Google sign-in work?", "Choose Continue with Google. It works after the owner configures the OAuth client. RankLens does not ask for your Google password."],
  ["Does it show demo visitor counts?", "No. A new site starts at zero. Automated browser tests are excluded from the built-in tracker, and sandbox payments are excluded from live revenue."],
  ["Does RankLens receive or route payments?", "No. Payment collection and bank settlement stay with the website owner’s payment provider. RankLens can record a verified payment event after the provider confirms it."],
  ["Who can use bot traffic reports?", "Bot traffic is available to customers with an active paid RankLens plan. Access activates after the payment provider confirms the payment; administrator accounts keep access."],
  ["Can I connect another website?", "Add its domain, install its unique tracking script and optionally send verified payment events from your server. Public tracking starts when RankLens is deployed on a public HTTPS address."],
  ["Are analytics and RankBid the same page?", "No. The public RankLens landing page, your private website list, the setup wizard and each website report have separate routes. RankBid product listings keep their existing account dashboard."],
  ["How private is visitor tracking?", "Raw IP addresses are never saved. Other websites use country-only aggregates from a trusted proxy and never request browser location. On RankBid, visitors can separately allow one location share rounded to about 10 km; it expires within 24 hours, shows no name or email, and does not track movement."],
] as const;

const features = [
  [Activity, "Follow real visits", "See visits over time, compare periods and inspect the sources sending traffic."],
  [MousePointer2, "Understand the journey", "Filter by page, campaign, browser or device, then compare visits with confirmed payments."],
  [BarChart3, "Connect verified revenue", "Record payment events from your server after provider confirmation. Refunds reduce reported revenue."],
] as const;

export default function LensMarketing({ initialIsAdmin, initialPlans }: RankLensMarketingProps) {
  const [faq, setFaq] = useState<number | null>(null);
  const plans = initialPlans;
  return <div className="lens-marketing">
    <header className="lens-marketing-nav">
      <Link href="/datafast" className="lens-brand"><RankBidMark size={29}/>RankLens</Link>
      <nav><a href="#pricing">Pricing</a><a href="#faq">FAQ</a><a href="#features">Features</a><Link href="/datafast/docs">Guide</Link><Link href="/datafast/partners">Partners</Link><Link href="/feedback">Feedback</Link></nav>
      <div className="lens-nav-actions"><Link href="/" target="_self" className="lens-cta lens-home-button"><ArrowLeft size={15}/>RankBid Home</Link><Link href="/datafast/dashboard" className="lens-control">Log in</Link><Link href="/datafast/dashboard/new" className="lens-cta">Add website</Link></div>
    </header>
    <main>
      <section className="lens-hero">
        <h1>Revenue-first analytics</h1>
        <p>Discover how visitors find your website,<br/>and see which visits turn into payments.</p>
        <Link className="lens-cta lens-large-cta" href="/stats">Open RankBid analytics <ArrowRight size={18}/></Link>
        <small>Public dashboard. No card required.</small>
        <div className="lens-trust"><ShieldCheck size={16}/>Real traffic · Verified payments · Clear attribution</div>
      </section>
      <section className="lens-demo">
        <div className="lens-demo-bar"><span><i/><i/><i/></span><p>RankBid · Interactive analytics</p><Link href="/stats" aria-label="Open analytics"><ExternalLink size={16}/></Link></div>
        <AnalyticsDashboard embedded/>
      </section>
      <section className="lens-value" id="features">
        <span className="lens-eyebrow">LESS GUESSWORK. MORE CLARITY.</span><h2>Turn your traffic into a clearer picture.</h2>
        <div className="lens-feature-grid">{features.map(([Icon,title,description])=><article key={title}><Icon size={25}/><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>
      <section className="lens-how">
        <div><span className="lens-eyebrow">HOW IT WORKS</span><h2>A useful view of your business,<br/>in three steps.</h2></div>
        <ol>
          <li><b>1</b><div><h3>Add your website</h3><p>Choose its domain and timezone in the private RankLens workspace.</p></div></li>
          <li><b>2</b><div><h3>Install the script</h3><p>Put its unique tracking snippet in your site’s page head.</p></div></li>
          <li><b>3</b><div><h3>Explore your report</h3><p>Filter real visits, then optionally add payment events from a verified server webhook.</p></div></li>
        </ol>
      </section>
      <section className="lens-pricing" id="pricing">
        <span className="lens-eyebrow">SIMPLE TO START</span><h2>Clear analytics for every website.</h2>
        <p className="lens-core-note">Core traffic analytics are included with RankBid. Optional premium tools are available to customer accounts.</p>
        {!initialIsAdmin && <>
          <div className="lens-premium-intro"><span className="lens-eyebrow">OPTIONAL PREMIUM TOOLS</span><h3>Spend less time stitching reports together.</h3><p>Premium access adds crawler reports, CSV exports, support conversations with the owner and expanded website capacity. Choose a starting plan, then set the number of days that suits you.</p></div>
          <div className="lens-plan-grid">{plans.map(plan=><article className={`lens-plan-card ${plan.id==="yearly"?"featured":""}`} key={plan.id}><span>{plan.label}</span><h3>{new Intl.NumberFormat("en-US",{style:"currency",currency:plan.currency,maximumFractionDigits:2}).format(plan.price)}<small> / {plan.days} {plan.days===1?"day":"days"}</small></h3><p>Premium access for {plan.days} {plan.days===1?"day":"days"}.</p><ul>{plan.features.map(item=><li key={item}><Check size={15}/>{item}</li>)}</ul><a href={`/datafast/dashboard/billing?plan=${encodeURIComponent(plan.id)}`} className="lens-cta">Choose this plan <ArrowRight size={15}/></a></article>)}</div>
          <p className="lens-plan-note">Choose a plan to set a custom duration and see the payment methods currently configured for this site. Access starts only after the payment provider confirms payment. A plan’s placement markup applies to RankBid placement bids while that plan is active.</p>
        </>}
      </section>
      <section className="lens-faq" id="faq">
        <div><span className="lens-eyebrow">FREQUENTLY ASKED QUESTIONS</span><h2>All your questions,<br/>answered.</h2><p>For setup details,<br/><Link href="/datafast/docs">read the implementation guide →</Link></p></div>
        <div className="lens-questions">{faqs.map(([question,answer],index)=><article key={question}><button aria-expanded={faq===index} onClick={()=>setFaq(faq===index?null:index)}>{question}<ChevronDown size={18} style={{transform:faq===index?"rotate(180deg)":undefined}}/></button>{faq===index&&<p>{answer}</p>}</article>)}</div>
      </section>
      <section className="lens-last-cta"><h2>Find revenue hiding in your traffic.</h2><p>Your live data, in one clear dashboard.</p><Link className="lens-cta" href="/stats">Explore RankBid analytics <ArrowRight size={16}/></Link></section>
      <PublicReviews/>
    </main>
    <footer className="lens-marketing-footer"><div className="lens-brand"><RankBidMark size={27}/> RankLens</div><p>Analytics for RankBid.</p><div><Link href="/">RankBid</Link><Link href="/stats">Public analytics</Link><Link href="/datafast/dashboard/billing">Billing</Link><Link href="/datafast/dashboard/settings">Settings</Link><Link href="/datafast/docs/getting-started">Documentation</Link><Link href="/datafast/partners">Partner program</Link><Link href="/feedback">Feedback &amp; reviews</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link></div><small>Independently built for this RankBid installation.</small></footer>
  </div>;
}
