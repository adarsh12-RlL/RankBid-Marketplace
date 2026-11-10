"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Check, Copy, RefreshCw, ShieldCheck } from "lucide-react";

type BotEvent = { provider: string; crawler: string; category: string; path: string; status_code: number | null; ip_verified: number; created_at: string };
type Report = { totals: { crawls: number; answers: number; indexing: number; training: number; other: number; crawlerCount: number }; events: BotEvent[]; tokenConfigured: boolean; retentionDays: number };

export default function AnalyticsBotTraffic({ siteId, domain }: { siteId: string; domain: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/sites/${encodeURIComponent(siteId)}/bot-traffic`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bot traffic could not load.");
      setReport(data);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Bot traffic could not load."); }
  }, [siteId]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function createToken() {
    if (report?.tokenConfigured && !window.confirm("The previous bot token will stop working immediately. Create a new token?")) return;
    setBusy(true); setError(""); setToken("");
    try {
      const response = await fetch(`/api/analytics/sites/${encodeURIComponent(siteId)}/bot-token`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bot token could not be created.");
      setToken(data.token);
      await refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Bot token could not be created."); }
    finally { setBusy(false); }
  }

  const snippet = token ? `// Call from server middleware for each incoming request. Never put this token in browser code.
import { randomUUID } from "node:crypto";

export function trackCrawlerRequest(request: Request) {
  const userAgent = request.headers.get("user-agent") || "";
  if (!/(bot|crawler|spider|chatgpt|gptbot|claude|perplexity|bing|google|applebot|bytespider|ccbot)/i.test(userAgent)) return;

  const appOrigin = process.env.RANKLENS_API_BASE_URL;
  const token = process.env.RANKLENS_BOT_TOKEN;
  if (!appOrigin || !token) return;

  const url = new URL(request.url);
  const endpoint = new URL("/api/analytics/bot-crawls", appOrigin);
  endpoint.searchParams.set("siteId", ${JSON.stringify(siteId)});
  void fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      eventId: randomUUID(),
      domain: ${JSON.stringify(domain)},
      href: url.origin + url.pathname,
      ai: { userAgent, source: "server_middleware" }
    })
  }).catch(() => {}); // Best effort: analytics must not slow the page response.
}

// Set RANKLENS_API_BASE_URL and the displayed RANKLENS_BOT_TOKEN in your server environment.` : "";

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { setError("Could not copy. Select the code and copy it manually."); }
  }

  return <section className="rl-bot-panel" aria-labelledby="rl-bot-title">
    <header className="rl-bot-heading"><div><span className="rl-bot-icon"><Bot size={18}/></span><div><h2 id="rl-bot-title">Bot traffic</h2><p>Search bots, AI crawlers, and requested pages · last 30 days</p></div></div><button className="rl-secondary" type="button" onClick={()=>void refresh()} aria-label="Refresh bot traffic"><RefreshCw size={15}/>Refresh</button></header>
    <div className="rl-bot-summary">
      <article><span>Requests</span><strong>{report?.totals.crawls ?? "—"}</strong></article>
      <article><span>AI answers</span><strong>{report?.totals.answers ?? "—"}</strong></article>
      <article><span>Indexing</span><strong>{report?.totals.indexing ?? "—"}</strong></article>
      <article><span>Training</span><strong>{report?.totals.training ?? "—"}</strong></article>
    </div>
    <p className="rl-bot-privacy"><ShieldCheck size={15}/> Server-side events only. RankLens does not store request IPs; crawler IP verification is not enabled, so agents are marked unverified. Event paths omit query strings and expire after {report?.retentionDays ?? 180} days.</p>
    {error&&<p role="alert" className="rl-form-error">{error}</p>}
    <div className="rl-bot-list">
      {!report ? <p>Loading bot activity…</p> : report.events.length ? report.events.map((event,index)=><article key={`${event.created_at}-${event.crawler}-${index}`}>
        <span className="rl-bot-event-icon"><Bot size={15}/></span><div><strong>{event.crawler}</strong><small>{event.provider} · {event.category} · {event.ip_verified ? "IP verified" : "IP unverified"}</small></div><code>{event.path}</code><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
      </article>) : <div className="rl-bot-empty"><strong>No bot traffic recorded yet</strong><span>Install the server-side snippet below, then wait for a recognized crawler to request a page.</span></div>}
    </div>
    <div className="rl-bot-setup">
      <div><strong>{report?.tokenConfigured ? "Server token is active" : "Connect your website server"}</strong><span>{report?.tokenConfigured ? "The secret is hidden after this page closes. Rotate it if it is lost." : "Create a site-specific secret. It is shown once and stored as a hash."}</span></div>
      <button className="rl-primary" type="button" disabled={busy||!report} onClick={()=>void createToken()}>{busy?"Creating…":report?.tokenConfigured?"Rotate token":"Create bot token"}</button>
    </div>
    {token&&<div className="rl-bot-code-wrap"><div className="rl-one-time-key"><strong>Copy this bot token now</strong><span>Keep it only in your website server environment. Rotating the token disables this one.</span><code>{token}</code><button type="button" className="rl-secondary" onClick={()=>void copy(token)}><Copy size={14}/>{copied?"Copied":"Copy token"}</button></div><details className="rl-bot-instructions"><summary>Show optional server setup code</summary><p>Set RANKLENS_API_BASE_URL to your deployed RankLens URL and RANKLENS_BOT_TOKEN to the token above. For local development, the base URL can be http://localhost:3000.</p><pre className="rl-bot-code"><code>{snippet}</code></pre><button type="button" className="rl-secondary" onClick={()=>void copy(snippet)}><Copy size={14}/>{copied?"Copied":"Copy server snippet"}</button></details></div>}
    <div className="rl-bot-categories"><span>Tracked: AI answer fetches, search indexing, training and other crawlers.</span><span>Browser visitors are ignored. This report is private to the website owner.</span></div>
  </section>;
}
