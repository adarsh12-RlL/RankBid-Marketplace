"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Copy, KeyRound, LockKeyhole, Settings2, ShieldCheck } from "lucide-react";
import RankBidMark from "@/components/RankBidMark";

type Site = { id: string; domain: string; timezone: string; key_configured: number };
type Tab = "general" | "api" | "more";
const timezoneFallback = ["Asia/Calcutta", "Asia/Kolkata", "UTC", "America/Los_Angeles", "America/New_York", "America/Chicago", "Europe/London", "Europe/Berlin", "Asia/Dubai", "Asia/Singapore", "Australia/Sydney"];
const timezoneOptions = typeof Intl.supportedValuesOf === "function"
  ? [...new Set([...timezoneFallback, ...Intl.supportedValuesOf("timeZone")])].sort((a, b) => a.localeCompare(b))
  : timezoneFallback;
const timezoneLabel = (timezone: string) => timezone.replace("/", " – ").replace(/_/g, " ");

export default function RankLensSettings({ email, sites, initialTab }: { email: string; sites: Site[]; initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);
  const [timezoneValues, setTimezoneValues] = useState<Record<string, string>>(() => Object.fromEntries(sites.map((site) => [site.id, site.timezone])));
  const [savedTimezones, setSavedTimezones] = useState<Record<string, string>>(() => Object.fromEntries(sites.map((site) => [site.id, site.timezone])));
  const [savingTimezone, setSavingTimezone] = useState("");
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");
  async function rotate(site: Site) {
    if (site.key_configured && !window.confirm(`The current revenue key for ${site.domain} will stop working immediately. Continue?`)) return;
    setBusy(site.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/analytics/sites/${encodeURIComponent(site.id)}/revenue-key`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "A revenue key could not be created.");
      setKeys((current) => ({ ...current, [site.id]: data.key }));
      setNotice(`A new server key for ${site.domain} is ready. Copy it now; it is shown only once.`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "A revenue key could not be created."); }
    finally { setBusy(""); }
  }
  async function copy(siteId: string, value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(siteId); window.setTimeout(() => setCopied(""), 1500); }
    catch { setError("Clipboard access is unavailable. Select the key and copy it manually."); }
  }
  async function saveTimezone(site: Site) {
    const timezone = timezoneValues[site.id] || site.timezone;
    setSavingTimezone(site.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/analytics/sites/${encodeURIComponent(site.id)}/timezone`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timezone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Timezone could not be saved.");
      setSavedTimezones((current) => ({ ...current, [site.id]: data.timezone }));
      setNotice(`Report timezone for ${site.domain} was saved.`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Timezone could not be saved."); }
    finally { setSavingTimezone(""); }
  }
  const tabHref = (value: Tab) => `/datafast/dashboard/settings${value === "general" ? "" : `?tab=${value}`}`;

  return <main className="rl-account-page"><header className="rl-account-header"><Link href="/datafast" className="rl-brand"><i><RankBidMark size={22}/></i>RankLens</Link><nav><Link href="/datafast/dashboard/billing">Billing</Link><Link href="/datafast/docs/getting-started">Documentation</Link><Link href="/datafast/dashboard">Websites</Link></nav><Link href="/datafast/dashboard" className="rl-account-back"><ArrowLeft size={15}/>Dashboard</Link></header>
    <div className="rl-account-layout"><aside className="rl-account-sidebar"><span>ACCOUNT</span>{(["general", "api", "more"] as Tab[]).map((item) => <Link key={item} href={tabHref(item)} onClick={() => setTab(item)} aria-current={tab === item ? "page" : undefined} className={tab === item ? "active" : ""}>{item === "general" ? <Settings2 size={16}/> : item === "api" ? <KeyRound size={16}/> : <ShieldCheck size={16}/>}<span>{item === "general" ? "General" : item === "api" ? "API / Integrations" : "More"}</span></Link>)}<Link href="/datafast/dashboard/billing"><span>Billing</span><ArrowRight size={14}/></Link></aside>
      <section className="rl-account-content"><span className="rl-doc-eyebrow">ACCOUNT SETTINGS</span><h1>{tab === "api" ? "API / Integrations" : tab === "more" ? "More settings" : "General settings"}</h1>
        {error && <p className="rl-account-alert" role="alert">{error}</p>}{notice && <p className="rl-account-success" role="status">{notice}</p>}
        {tab === "general" && <div className="rl-settings-stack">
          <article className="rl-settings-card"><div className="rl-setting-icon"><Settings2 size={18}/></div><div><span>Signed-in account</span><strong>{email}</strong><p>This account can only view websites owned by this sign-in.</p></div></article>
          {sites.length ? sites.map((site) => <article className="rl-settings-card rl-timezone-setting" key={site.id}><div className="rl-setting-icon"><BookOpen size={18}/></div><div className="rl-timezone-main"><span>Report timezone</span><strong>{site.domain}</strong><p>The timezone controls the start and end of daily reports for this website.</p><label htmlFor={`timezone-${site.id}`}>Timezone</label><select id={`timezone-${site.id}`} value={timezoneValues[site.id] || site.timezone} onChange={(event) => setTimezoneValues((current) => ({ ...current, [site.id]: event.target.value }))}>{timezoneOptions.map((timezone) => <option key={timezone} value={timezone}>{timezoneLabel(timezone)}</option>)}</select><small>Current saved timezone: {timezoneLabel(savedTimezones[site.id] || site.timezone)}</small></div><button type="button" className="rl-account-secondary" disabled={savingTimezone === site.id || (timezoneValues[site.id] || site.timezone) === (savedTimezones[site.id] || site.timezone)} onClick={() => void saveTimezone(site)}>{savingTimezone === site.id ? "Saving…" : "Save timezone"}</button></article>) : <article className="rl-settings-card"><div className="rl-setting-icon"><BookOpen size={18}/></div><div><span>Report timezone</span><strong>No websites yet</strong><p>Add a website to choose its reporting timezone. This opens the website setup wizard; timezone selection is part of that flow.</p></div><Link href="/datafast/dashboard/new" className="rl-account-inline">Add website <ArrowRight size={14}/></Link></article>}
          <article className="rl-settings-card"><div className="rl-setting-icon"><LockKeyhole size={18}/></div><div><span>Privacy defaults</span><strong>No browser GPS or exact location</strong><p>Country totals require a trusted server proxy. Raw IP addresses are not saved.</p></div><Link href="/datafast/docs/privacy" className="rl-account-inline">Read privacy guide <ArrowRight size={14}/></Link></article>
        </div>}
        {tab === "api" && <div className="rl-settings-stack"><div className="rl-account-note"><ShieldCheck size={17}/><span>Access is limited to your own websites. A revenue key can write verified revenue events for one website; it cannot access another account or manage teams.</span></div>
          {!sites.length ? <article className="rl-settings-card rl-settings-empty"><KeyRound size={18}/><div><strong>No websites yet</strong><p>Add a website before creating a site-scoped API key. The dashboard and settings use the same website setup wizard.</p><Link href="/datafast/dashboard/new" className="rl-account-inline">Add website <ArrowRight size={14}/></Link></div></article> : sites.map((site) => <article className="rl-key-card" key={site.id}><div className="rl-key-card-head"><div><span>WEBSITE API</span><h2>{site.domain}</h2><p>Timezone: {site.timezone}</p></div><span className={`rl-key-status ${site.key_configured ? "configured" : ""}`}><i/>{site.key_configured ? "Key configured" : "No key"}</span></div><p className="rl-key-description">Use this server-only key to report provider-confirmed captures and refunds for this website.</p>
            {keys[site.id] ? <div className="rl-key-reveal"><strong>Copy this key now</strong><span>It is not stored in readable form and will not be shown again.</span><code>{keys[site.id]}</code><button type="button" onClick={() => void copy(site.id, keys[site.id])}><Copy size={14}/>{copied === site.id ? "Copied" : "Copy key"}</button></div> : <button className="rl-account-primary" type="button" disabled={!!busy} onClick={() => void rotate(site)}>{busy === site.id ? "Creating key…" : site.key_configured ? "Rotate revenue key" : "Create revenue key"}<ArrowRight size={15}/></button>}
          </article>)}
          <Link href="/datafast/docs/api" className="rl-doc-link-card"><BookOpen size={18}/><span><strong>API guide</strong><small>Read key handling and integration instructions.</small></span><ArrowRight size={15}/></Link>
        </div>}
        {tab === "more" && <div className="rl-settings-stack">
          <Link href="/datafast/dashboard/billing" className="rl-settings-link"><div className="rl-setting-icon"><ArrowRight size={18}/></div><div><span>Plans and billing</span><strong>View your RankLens access</strong><p>Core analytics are included. Paid tools unlock after a payment provider confirms the subscription payment.</p></div></Link>
          <Link href="/datafast/docs/getting-started" className="rl-settings-link"><div className="rl-setting-icon"><BookOpen size={18}/></div><div><span>Documentation</span><strong>Watch the guided setup</strong><p>Step-by-step original RankLens tutorials with English voice narration.</p></div></Link>
          <Link href="/datafast/partners" className="rl-settings-link"><div className="rl-setting-icon"><ArrowRight size={18}/></div><div><span>Partner program</span><strong>Enrollment status</strong><p>Referral tracking and payouts are not enabled in this local version.</p></div></Link>
          <article className="rl-account-note"><ShieldCheck size={17}/><span>Analytics events expire according to the retention period shown on their report. Country-level reporting does not identify an individual visitor.</span></article>
        </div>}
      </section>
    </div>
  </main>;
}
