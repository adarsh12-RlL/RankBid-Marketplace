"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, Globe2, Search, ShieldCheck } from "lucide-react";
import AnalyticsGlobe from "@/components/AnalyticsGlobe";
import RankBidMark from "@/components/RankBidMark";
import RankLensHomeLink from "@/components/RankLensHomeLink";

type Site = { id: string; domain: string; timezone: string };
const steps = ["Add website", "Install script", "Attribute revenue (optional)"];
const zones = ["Asia/Calcutta", "Asia/Kolkata", "UTC", "America/Los_Angeles", "America/New_York", "America/Chicago", "Europe/London", "Europe/Berlin", "Asia/Dubai", "Asia/Singapore", "Australia/Sydney"];
const timezoneOptions = typeof Intl.supportedValuesOf === "function"
  ? [...new Set([...zones, ...Intl.supportedValuesOf("timeZone")])].sort((a,b)=>a.localeCompare(b))
  : zones;
const timezoneFormatters = new Map<string, Intl.DateTimeFormat>();
function timezoneLabel(zone: string) { return zone.replace("/", " – ").replace(/_/g, " "); }
function timezoneTime(zone: string, now: Date) {
  try {
    let formatter = timezoneFormatters.get(zone);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat("en-IN", { timeZone: zone, hour: "numeric", minute: "2-digit", hour12: true });
      timezoneFormatters.set(zone, formatter);
    }
    return formatter.format(now);
  } catch { return "—"; }
}
export default function AnalyticsSiteSetup({appOrigin}:{appOrigin:string}) {
  const search = useSearchParams(), router = useRouter();
  const siteId = search.get("siteId") || "", queryStep = search.get("step") || "add";
  const step = queryStep === "script" ? 1 : queryStep === "revenue" ? 2 : 0;
  const [domain, setDomain] = useState(""), [timezone, setTimezone] = useState("Asia/Calcutta"), [site, setSite] = useState<Site|null>(null);
  const [timezoneOpen, setTimezoneOpen] = useState(false), [timezoneSearch, setTimezoneSearch] = useState(""), [clockNow, setClockNow] = useState(() => Date.now());
  const timezonePicker = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [copied, setCopied] = useState(false);
  const [provider, setProvider] = useState("Stripe"), [revenueKey, setRevenueKey] = useState(""), [keyBusy, setKeyBusy] = useState(false);
  useEffect(() => { if (!siteId) return; let active=true; fetch("/api/analytics/sites/"+encodeURIComponent(siteId),{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||"Website setup not found.");if(active)setSite(d.site);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;}; },[siteId]);
  useEffect(() => { const timer=window.setInterval(()=>setClockNow(Date.now()),15000); return()=>window.clearInterval(timer); },[]);
  useEffect(() => {
    function closeOnOutside(event: PointerEvent) { if (!timezonePicker.current?.contains(event.target as Node)) setTimezoneOpen(false); }
    window.addEventListener("pointerdown", closeOnOutside);
    return () => window.removeEventListener("pointerdown", closeOnOutside);
  },[]);
  const script = useMemo(() => site && appOrigin ? `<script defer src="${appOrigin}/ranklens.js" data-site-id="${site.id}"></script>` : "", [site, appOrigin]);
  function go(nextStep:number,id=siteId){router.replace(nextStep===0?"/datafast/dashboard/new":`/datafast/dashboard/new?step=${nextStep===1?"script":"revenue"}&siteId=${encodeURIComponent(id)}`);}
  async function addSite(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");try{const response=await fetch("/api/analytics/sites",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({domain:domain.trim(),timezone})});const data=await response.json();if(!response.ok)throw Error(data.error||"Website could not be added.");setSite(data.site);router.replace(`/datafast/dashboard/new?step=script&siteId=${encodeURIComponent(data.site.id)}`);}catch(e:unknown){setError(e instanceof Error?e.message:"Website could not be added.");}finally{setBusy(false);}}
  async function copy(value:string){try{await navigator.clipboard.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{setError("Clipboard access failed. Select and copy the code manually.");}}
  async function createKey(){if(!site)return;setKeyBusy(true);setError("");try{const response=await fetch(`/api/analytics/sites/${encodeURIComponent(site.id)}/revenue-key`,{method:"POST"});const data=await response.json();if(!response.ok)throw Error(data.error||"Revenue key could not be created.");setRevenueKey(data.key);}catch(e:unknown){setError(e instanceof Error?e.message:"Revenue key could not be created.");}finally{setKeyBusy(false);}}
  const revenueSnippet=site&&revenueKey&&appOrigin?`// Run only on your server, after the payment provider confirms the payment.\nawait fetch("${appOrigin}/api/analytics/site-revenue?siteId=${site.id}", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer ${revenueKey}",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    type: "capture", eventId: "provider-event-id", paymentId: "provider-payment-id",\n    visitorId: "visitor-id-from-your-first-party-cookie", amountCents: 1200\n  })\n});\n// Refunds use type: "refund" and the same paymentId.`:"";
  const currentTime = timezoneTime(timezone, new Date(clockNow));
  const filteredTimezones = useMemo(() => {
    const query=timezoneSearch.trim().toLocaleLowerCase();
    return timezoneOptions.filter(zone=>!query||zone.toLocaleLowerCase().includes(query)||timezoneLabel(zone).toLocaleLowerCase().includes(query));
  },[timezoneSearch]);
  return <main className="rl-setup">
    <AnalyticsGlobe/>
    <header className="rl-setup-nav"><Link href="/datafast" className="rl-brand" aria-label="RankLens front page"><i><RankBidMark size={22}/></i>RankLens</Link><div className="ranklens-nav-actions"><RankLensHomeLink /><Link href="/datafast/dashboard" className="rl-account">Dashboard</Link></div></header>
    <div className="rl-setup-wrap">
      <Link href="/datafast/dashboard" className="rl-back"><ArrowLeft size={15}/> Dashboard</Link>
      <nav className="rl-stepper" aria-label="Website setup steps">{steps.map((label,index)=><div key={label} className={index===step?"active":index<step?"done":""}><i>{index<step?<Check size={13}/>:null}</i><span>{label}</span></div>)}</nav>
      <section className="rl-setup-card">
        <div className="rl-setup-card-head"><h1>{steps[step]}</h1>{step===0&&<><p>Add a website to start a separate analytics workspace.</p><p className="rl-setup-account-note">This creates a website property under your signed-in account. It does not create a customer login or an admin ID.</p></>}</div>
        {step===0&&<form className="rl-setup-form" onSubmit={addSite}>
          <label htmlFor="website-domain">Domain</label><div className="rl-domain-input"><Globe2 size={16}/><span>https://</span><input id="website-domain" autoFocus value={domain} onChange={e=>setDomain(e.target.value)} placeholder="example.com" autoComplete="url" maxLength={300} required/></div>
          <label htmlFor="website-timezone" className="rl-timezone-label">Timezone</label>
          <div className="rl-timezone" ref={timezonePicker}>
            <button id="website-timezone" type="button" className="rl-timezone-trigger" aria-haspopup="listbox" aria-expanded={timezoneOpen} aria-controls="ranklens-timezone-options" onClick={()=>{setTimezoneOpen(value=>!value);setTimezoneSearch("");}} onKeyDown={event=>{if(event.key==="ArrowDown"){event.preventDefault();setTimezoneOpen(true);}}}>
              <span className="rl-timezone-selected">{timezoneLabel(timezone)}</span><span className="rl-timezone-time">where time is {currentTime}</span><ChevronDown size={15}/>
            </button>
            {timezoneOpen&&<div className="rl-timezone-menu">
              <div className="rl-timezone-search"><Search size={15}/><input type="search" aria-label="Search timezone" placeholder="Search timezone…" value={timezoneSearch} onChange={event=>setTimezoneSearch(event.target.value)} autoFocus onKeyDown={event=>{if(event.key==="Escape")setTimezoneOpen(false);}}/></div>
              <div id="ranklens-timezone-options" className="rl-timezone-options" role="listbox" aria-label="Timezone options">
                {filteredTimezones.length?filteredTimezones.map(zone=><button type="button" role="option" aria-selected={timezone===zone} className="rl-timezone-option" key={zone} onClick={()=>{setTimezone(zone);setTimezoneOpen(false);setTimezoneSearch("");}}><span>{timezoneLabel(zone)}</span><time>{timezoneTime(zone,new Date(clockNow))}</time></button>):<p className="rl-timezone-empty">No matching timezone.</p>}
              </div>
            </div>}
          </div>
          <p className="rl-form-hint">This defines what “today” means in your reports.</p>
          <button className="rl-primary" disabled={busy}>{busy?"Adding website…":"Add website"}<ArrowRight size={16}/></button>
        </form>}
        {step===1&&<div className="rl-setup-body">
          {site?<><p>Install this snippet in the <code>&lt;head&gt;</code> of <strong>{site.domain}</strong>. It records anonymous page events for this website only.</p>
            <div className="rl-code"><code>{script}</code><button type="button" aria-label="Copy tracking code" onClick={()=>copy(script)}><Copy size={17}/></button></div>
            <p className="rl-local-note">{appOrigin?<>This snippet points to {appOrigin}. For visitors on a public website to reach it, RankLens must be deployed on a public HTTPS address.</>:"Preparing the tracking code…"}</p>
            <div className="rl-privacy-banner"><ShieldCheck size={18}/><span>The script never requests GPS. With a configured trusted proxy, it stores only a two-letter country code for aggregate counts; raw IP, city, region and precise coordinates are never stored.</span></div>
            <div className="rl-step-actions"><button className="rl-secondary" onClick={()=>go(0)}>Back</button><button className="rl-primary" onClick={()=>go(2)}>Continue to optional revenue setup<ArrowRight size={16}/></button></div>
          </>:<p role="status">{error||"Loading website setup…"}</p>}
        </div>}
        {step===2&&<div className="rl-setup-body">
          {site&&<><p>Send a payment event only after Stripe, Razorpay, or another provider confirms capture. This is an optional server-to-server API; RankLens does not ask for your payment account password or secret key.</p>
            <label htmlFor="payment-provider">Payment provider</label><select id="payment-provider" className="rl-provider" value={provider} onChange={e=>setProvider(e.target.value)}><option>Stripe</option><option>Razorpay</option><option>Other provider</option></select>
            <p className="rl-form-hint">{provider} connection method: have your own server verify the signed provider webhook, then call this API. Never send a payment-provider secret from browser JavaScript.</p>
            {!revenueKey?<button className="rl-primary rl-key-button" disabled={keyBusy} onClick={createKey}>{keyBusy?"Creating…":"Create server API key"}<ArrowRight size={16}/></button>:<>
              <div className="rl-one-time-key"><strong>Copy this server key now</strong><span>It is shown once and stored only as a hash. Rotating it will invalidate this key.</span><code>{revenueKey}</code><button className="rl-secondary" onClick={()=>copy(revenueKey)}><Copy size={15}/>{copied?"Copied":"Copy key"}</button></div>
              <div className="rl-code rl-revenue-code"><code>{revenueSnippet}</code><button type="button" aria-label="Copy revenue API example" onClick={()=>copy(revenueSnippet)}><Copy size={17}/></button></div>
              <p className="rl-form-hint">Example accepts USD cents, uses idempotent event IDs, and rejects refunds larger than the confirmed capture. The visitor ID is from cookie <code>rl_vid_{site.id}</code>.</p>
            </>}
            <div className="rl-privacy-banner"><ShieldCheck size={18}/><span>Country totals require the owner to configure a trusted proxy. API calls should come from your server after payment verification.</span></div>
            {error&&<p className="rl-form-error" role="alert">{error}</p>}
            <div className="rl-step-actions"><button className="rl-secondary" onClick={()=>go(1)}>Back</button><Link className="rl-primary" href={`/datafast/dashboard/sites/${encodeURIComponent(site.id)}`}>Finish setup<ArrowRight size={16}/></Link></div>
          </>}
        </div>}
        {error&&step===0&&<p className="rl-form-error" role="alert">{error}</p>}
      </section>
      <p className="rl-footnote">Account security uses short-lived in-memory rate limits. Country-level totals are optional; precise location is not collected.</p>
    </div>
  </main>;
}
