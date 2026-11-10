"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RefreshCw, Plus, X, ArrowUpRight, Globe, Maximize2, Chrome, Compass, Monitor, Smartphone, Flame, Radio } from "lucide-react";
import type { AnalyticsActivity, AnalyticsFilter, AnalyticsLocationPoint, Dimension } from "@/lib/analytics-types";
import AnalyticsSourcesChart from "./AnalyticsSourcesChart";
import AnalyticsRealtimeMap from "./AnalyticsRealtimeMap";
import RankBidMark from "./RankBidMark";
import RankLensHomeLink from "./RankLensHomeLink";
import AnalyticsViewControls from "./AnalyticsViewControls";
import AnalyticsCountryCard from "./AnalyticsCountryCard";
import AnalyticsMemberSummary, { type MembershipTotals } from "./AnalyticsMemberSummary";

const labels: Record<string, string> = {
  today: "Today", yesterday: "Yesterday", last24h: "Last 24 hours", last7d: "Last 7 days",
  last30d: "Last 30 days", week_to_date: "Week to date", month_to_date: "Month to date", custom: "Custom dates",
};
const dimensionLabels: Record<Dimension, string> = {
  channel: "Channel", referrer: "Referrer", campaign: "Campaign", path: "Page",
  hostname: "Hostname", entry_path: "Entry page", exit_url: "Exit link", browser: "Browser", os: "OS", device: "Device", country: "Country",
};
const dimensions = Object.keys(dimensionLabels) as Dimension[];
const operators = ["is", "is_not", "contains", "not_contains"];
const money = (n: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 2,
}).format(Number.isFinite(n) ? n : 0);
const integer = (n: number) => new Intl.NumberFormat("en-US").format(n);
const day = (timezone = "UTC") => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)?.value || "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
type Metric = "visitors" | "revenue";
interface Query {
  period: string; granularity: "hourly" | "daily"; offset: number;
  filters: AnalyticsFilter[]; from: string; to: string;
}
interface Breakdown { name: string; visitors: number; value?: string; clicks?: number }
interface Report {
  period: string; granularity: string; timezone?: string; from: string; to: string; visitors: number; pageviews: number;
  revenue: number; conversions: number; conversionRate: number; bounceRate: number;
  sessionSeconds: number; online: number; change: number | null; revenueChange?: number | null;
  series: { time: string; visitors: number; revenue: number }[];
  breakdowns: Partial<Record<Dimension, Breakdown[]>>;
  funnel: { name: string; count: number }[]; updatedAt: string; recentActivity?: AnalyticsActivity[];
  realtimeBreakdowns?: Partial<Record<Dimension, Breakdown[]>>;
  sharedLocationPoints?: AnalyticsLocationPoint[];
  previousFrom?: string; previousTo?: string; capabilities?: { exitLinks?: boolean };
  members?: MembershipTotals;
}
const initial = (timezone = "UTC"): Query => ({ period: "last24h", granularity: "hourly", offset: 0, filters: [], from: day(timezone), to: day(timezone) });
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function readFilters(raw: string | null): AnalyticsFilter[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed) || parsed.length > 5) return [];
    return parsed.filter((f): f is AnalyticsFilter => !!f && typeof f === "object" &&
      dimensions.includes(f.dimension) && typeof f.value === "string" && f.value.length <= 256 &&
      operators.includes(f.operator || "is"));
  } catch { return []; }
}
function displayWindow(from?: string, to?: string, timezone = "UTC") {
  if (!from || !to) return "All dates and times use " + timezone;
  const format = (date: Date) => date.toLocaleString("en-US", {
    timeZone: timezone, month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return format(new Date(from)) + " – " + format(new Date(new Date(to).getTime() - 1)) + " " + timezone;
}
export default function AnalyticsDashboard({ embedded = false, reportUrl = "/api/analytics/report", timezone = "UTC" }: { embedded?: boolean; reportUrl?: string; timezone?: string }) {
  const [query, setQuery] = useState<Query>(() => initial(timezone)), [ready, setReady] = useState(false);
  const [metric, setMetric] = useState<Metric>("visitors");
  const [data, setData] = useState<Report | null>(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [reload, setReload] = useState(0), [hover, setHover] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false), [dim, setDim] = useState<Dimension>("path");
  const [value, setValue] = useState(""), [operator, setOperator] = useState<AnalyticsFilter["operator"]>("is");
  const [sourceTab, setSourceTab] = useState<Dimension>("channel"), [pageTab, setPageTab] = useState<Dimension>("path");
  const [techTab, setTechTab] = useState<Dimension>("browser");
  const [theme,setTheme]=useState<"dark"|"light">(embedded?"light":"dark");
  const [realtime,setRealtime]=useState(false);
  const [details,setDetails]=useState<{title:string;dimension:Dimension}|null>(null);
  const dialogRef=useRef<HTMLDivElement>(null);
  const [goalTab, setGoalTab] = useState("goal");
  const [draftFrom, setDraftFrom] = useState(() => day(timezone)), [draftTo, setDraftTo] = useState(() => day(timezone)), [dateError, setDateError] = useState("");
  const chartId = "lens-chart-" + useId().replace(/:/g, "");
  const showMemberCounts = reportUrl.split("?")[0] === "/api/analytics/report";
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (!embedded) { try { localStorage.setItem("ranklens-dashboard-theme", next); } catch {} }
  }
  useEffect(()=>{if(embedded)return;try{const saved=localStorage.getItem("ranklens-dashboard-theme");if(saved==="dark"||saved==="light")setTheme(saved);}catch{}},[embedded]);
  useEffect(()=>{
    if(!details)return;const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;document.body.style.overflow="hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keydown=(event:KeyboardEvent)=>{if(event.key==="Escape"){setDetails(null);return;}if(event.key!=="Tab")return;const nodes=dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,[tabindex="0"]');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}};
    document.addEventListener("keydown",keydown);return()=>{document.body.style.overflow=overflow;document.removeEventListener("keydown",keydown);if(previous?.isConnected)previous.focus();};
  },[details]);
  useEffect(() => {
    const params = new URLSearchParams(location.search), next = initial(timezone);
    if (labels[params.get("period") || ""]) next.period = params.get("period")!;
    if (params.get("granularity") === "daily") next.granularity = "daily";
    const offset = Number(params.get("offset"));
    if (Number.isInteger(offset) && offset >= 0 && offset <= 60) next.offset = offset;
    next.filters = readFilters(params.get("filters"));
    if (validDate(params.get("from") || "")) next.from = params.get("from")!;
    if (validDate(params.get("to") || "")) next.to = params.get("to")!;
    if (params.get("metric") === "revenue") setMetric("revenue");
    setRealtime(!embedded && params.get("realtime") === "1");
    setQuery(next); setDraftFrom(next.from); setDraftTo(next.to); setReady(true);
  }, [embedded, timezone]);
  useEffect(() => {
    if (!realtime) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setRealtime(false); };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", escape); };
  }, [realtime]);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController(); let latest = 0;
    setData(null); setHover(null);
    async function load() {
      const sequence = ++latest; setLoading(true);
      try {
        const params = new URLSearchParams({ period: query.period, granularity: query.granularity,
          offset: String(query.offset), filters: JSON.stringify(query.filters) });
        if (query.period === "custom") { params.set("from", query.from); params.set("to", query.to); }
        if (realtime) params.set("realtime", "1");
        const separator = reportUrl.includes("?") ? "&" : "?";
        const response = await fetch(reportUrl + separator + params, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Analytics could not load.");
        if (sequence === latest && !controller.signal.aborted) { setData(result); setError(""); }
      } catch (failure: unknown) {
        if (!controller.signal.aborted && sequence === latest)
          setError(failure instanceof Error && failure.message.startsWith("Invalid") ? failure.message : "Analytics could not load. Try refresh.");
      } finally { if (!controller.signal.aborted && sequence === latest) setLoading(false); }
    }
    const refreshLocation = () => { void load(); };
    void load(); const timer = setInterval(load, realtime ? 10000 : 30000);
    window.addEventListener("rankbid-location-change", refreshLocation);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("rankbid-location-change", refreshLocation); };
  }, [query, reload, ready, reportUrl, realtime]);
  useEffect(() => {
    if (!ready || embedded) return;
    const url = new URL(location.href);
    url.searchParams.set("period", query.period); url.searchParams.set("granularity", query.granularity);
    if (query.offset) url.searchParams.set("offset", String(query.offset)); else url.searchParams.delete("offset");
    if (query.filters.length) url.searchParams.set("filters", JSON.stringify(query.filters)); else url.searchParams.delete("filters");
    if (query.period === "custom") { url.searchParams.set("from", query.from); url.searchParams.set("to", query.to); }
    else { url.searchParams.delete("from"); url.searchParams.delete("to"); }
    if (metric === "revenue") url.searchParams.set("metric", metric); else url.searchParams.delete("metric");
    if (realtime) url.searchParams.set("realtime", "1"); else url.searchParams.delete("realtime");
    history.replaceState(null, "", url);
  }, [query, metric, ready, embedded, realtime]);
  const patchQuery = (patch: Partial<Query>) => setQuery(previous => ({ ...previous, ...patch }));
  function addFilter(dimension: Dimension, selected: string) {
    if (query.filters.length >= 5 || query.filters.some(f => f.dimension === dimension && f.value === selected && (f.operator || "is") === "is")) return false;
    patchQuery({ filters: [...query.filters, { dimension, value: selected, operator: "is" }], offset: 0 });
    setDetails(null);
    return true;
  }
  const rows = (dimension: Dimension) => data?.breakdowns?.[dimension] || [];
  const series = data?.series || [], maximum = Math.max(metric === "revenue" ? .01 : 1, ...series.map(row => row[metric]));
  const pointX = (index: number) => 50 + index * 920 / Math.max(1, series.length - 1);
  const points = series.map((row, index) => pointX(index) + "," + (300 - row[metric] / maximum * 240)).join(" ");
  const metricValue = (n: number) => metric === "revenue" ? money(n) : integer(n);
  const zero = !!data && !(metric === "visitors" ? data.visitors : data.revenue);
  function rowIcon(dimension:Dimension,row:Breakdown){
    if (dimension === "country") {
      const code = row.value ?? row.name;
      return /^[A-Z]{2}$/.test(code) ? <span className="lens-country-flag" aria-hidden="true">{String.fromCodePoint(...[...code].map(letter => 127397 + letter.charCodeAt(0)))}</span> : null;
    }
    if(dimension!=="browser"&&dimension!=="os"&&dimension!=="device")return null;
    const name=row.name.toLowerCase();const Icon=/chrome/.test(name)?Chrome:/safari/.test(name)?Compass:/firefox/.test(name)?Flame:/mobile|android|ios|iphone/.test(name)?Smartphone:/windows|desktop|macos|linux/.test(name)?Monitor:Globe;
    return <Icon size={16} className={"lens-row-icon "+(/firefox/.test(name)?"lens-icon-orange":/android/.test(name)?"lens-icon-green":"lens-icon-blue")} aria-hidden="true"/>;
  }
  function rowList(dimension: Dimension, limit: number) {
    const items = rows(dimension), max = Math.max(1, ...items.map(row => dimension === "exit_url" ? row.clicks || 0 : row.visitors));
    return items.slice(0, limit).map(row => {
      let name = row.name;
      if (dimension === "country") {
        const code = row.value ?? row.name;
        if (code === "Unknown") name = "Unknown country";
        else if (/^[A-Z]{2}$/.test(code)) { try { name = new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code; } catch {} }
      }
      return <button type="button" key={row.value ?? row.name} className="lens-row"
      onClick={() => addFilter(dimension, row.value ?? row.name)} title={"Filter " + dimensionLabels[dimension] + ": " + row.name}
      disabled={query.filters.length >= 5}>
      <span className="lens-bar" style={{ width: (dimension === "exit_url" ? row.clicks || 0 : row.visitors) / max * 100 + "%" }} />
      <span className="lens-row-name">{rowIcon(dimension,row)}{name}</span><span className="lens-row-value" style={{ whiteSpace: "nowrap" }}>{dimension === "exit_url" ? integer(row.clicks || 0) + " clicks · " + integer(row.visitors) + " visitors" : integer(row.visitors)}</span>
    </button>; });
  }
  function breakdown(title: string, tabs: [Dimension, string][], active: Dimension, setActive: (dimension: Dimension) => void, source = false) {
    const items = rows(active);
    return <section className={"lens-card lens-breakdown " + (source ? "lens-source-card" : "")} aria-label={title}>
      <div className="lens-card-head"><div className="lens-tabs" role="tablist" aria-label={title}>
        {tabs.map(([dimension, label]) => <button type="button" role="tab" aria-selected={active === dimension} key={dimension}
          className={active === dimension ? "active" : ""} onClick={() => setActive(dimension)}>{label}</button>)}
        
      </div><span className="lens-muted">{active === "exit_url" ? integer(items.reduce((sum, row) => sum + (row.clicks || 0), 0)) + " clicks" : (data ? integer(data.visitors) : "—") + " visitors"}</span></div>
      {source && <AnalyticsSourcesChart items={items} totalVisitors={data?.visitors||0} dimensionLabel={dimensionLabels[active]} onSelect={selected=>addFilter(active,selected)} disabled={query.filters.length>=5} loading={loading}/>}
      {!source && <div className="lens-rows">{items.length ? rowList(active, 10) :
        <div className="lens-empty">{loading ? "Loading " + title.toLowerCase() + "…" : "No " + title.toLowerCase() + " data in this period"}</div>}</div>}
      {source && items.length > 0 && <p className="lens-source-note">Visitor counts can overlap across sources.</p>}
      {title === "Pages" && <p className="lens-source-note">{active === "entry_path" ? "First recorded page in each session." :
        active === "hostname" ? "Recorded hostnames. Older events without a hostname appear as Unknown." : active === "exit_url" ? "Actual outbound destination origins. Paths, query strings and fragments are never stored." : "Pages recorded during the selected " + (data?.timezone || timezone) + " period."}</p>}
      <button type="button" className="lens-details" disabled={!items.length} onClick={()=>setDetails({title,dimension:active})}>
        <Maximize2 size={12}/> DETAILS
      </button>
    </section>;
  }
  const metrics: { name: string; value: string; metric?: Metric; change?: number | null }[] = [
    { name: "Visitors", value: data ? integer(data.visitors) : "—", metric: "visitors", change: data?.change },
    { name: "Revenue", value: data ? money(data.revenue) : "—", metric: "revenue", change: data?.revenueChange },
    { name: "Conversion rate", value: data ? data.conversionRate.toFixed(2) + "%" : "—" },
    { name: "Revenue / visitor", value: data ? money(data.visitors ? data.revenue / data.visitors : 0) : "—" },
    { name: "Bounce rate", value: data ? data.bounceRate.toFixed(0) + "%" : "—" },
    { name: "Session time", value: data ? Math.floor(data.sessionSeconds / 60) + "m " + data.sessionSeconds % 60 + "s" : "—" },
    { name: "Online visitors", value: data ? integer(data.online) : "—" },
  ];
  if (realtime) return <AnalyticsRealtimeMap data={data} loading={loading}
    onExit={() => setRealtime(false)} onFilter={addFilter} theme={theme} onThemeToggle={toggleTheme}
    filters={query.filters} onRemoveFilter={index => patchQuery({ filters: query.filters.filter((_, item) => item !== index), offset: 0 })}
    onClearFilters={() => patchQuery({ filters: [], offset: 0 })}
    showMemberCounts={showMemberCounts} error={error} onRefresh={() => setReload(value => value + 1)}/>;
  return <div className={"lens-app lens-analytics lens-"+theme+" " + (embedded ? "lens-embedded" : "")}>
    {!embedded && <header className="lens-top"><Link href="/datafast" className="lens-brand"><RankBidMark size={29} /> RankLens</Link>
      <div className="lens-top-actions"><RankLensHomeLink /><Link href="/datafast/dashboard" className="lens-cta">Websites</Link></div></header>}
    <main className="lens-main">
      <div className="lens-controls"><Link className="lens-control" href="/"><RankBidMark size={18} /> RankBid</Link>
        <div className="lens-control-group"><button type="button" aria-label="Previous period" disabled={query.offset >= 60} onClick={() => patchQuery({ offset: query.offset + 1 })}><ChevronLeft size={16} /></button>
          <label className="lens-select"><select aria-label="Date range" value={query.period} onChange={event => { patchQuery({ period: event.target.value, offset: 0 }); setDateError(""); }}>
            {Object.entries(labels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
          <button type="button" aria-label="Next period" disabled={!query.offset} onClick={() => patchQuery({ offset: Math.max(0, query.offset - 1) })}><ChevronRight size={16} /></button></div>
        <label className="lens-control"><select aria-label="Chart granularity" value={query.granularity} onChange={event => patchQuery({ granularity: event.target.value as Query["granularity"] })}>
          <option value="hourly">Hourly</option><option value="daily">Daily</option></select></label>
        <button type="button" className="lens-control" aria-label="Refresh analytics" onClick={() => setReload(previous => previous + 1)}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>
        {embedded ? <Link className="lens-control" href="/stats?period=last24h&granularity=hourly&realtime=1"><Radio size={15}/>Realtime</Link> :
          <button type="button" className="lens-control" aria-pressed={false} onClick={() => setRealtime(true)}><Radio size={15}/>Realtime</button>}
        <button type="button" className="lens-control" aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)}><Plus size={14} /> Filter</button>
      </div>
      {showMemberCounts && <AnalyticsMemberSummary members={data?.members} onlineVisitors={data?.online}/>}
      {query.period === "custom" && <form className="lens-filter-form lens-date-form" onSubmit={event => {
        event.preventDefault();
        const span = (new Date(draftTo).getTime() - new Date(draftFrom).getTime()) / 86400000 + 1;
        if (!validDate(draftFrom) || !validDate(draftTo) || draftFrom > draftTo || draftTo > day(timezone) || span > 366) {
          setDateError("Choose valid dates in the selected timezone, in order, up to today and at most 366 days."); return;
        }
        setDateError(""); patchQuery({ from: draftFrom, to: draftTo, offset: 0 });
      }}><label>From ({timezone})<input aria-label={"Custom start date " + timezone} type="date" value={draftFrom} max={draftTo || day(timezone)} required onChange={event => setDraftFrom(event.target.value)} /></label>
        <label>Through ({timezone})<input aria-label={"Custom end date " + timezone} type="date" value={draftTo} min={draftFrom} max={day(timezone)} required onChange={event => setDraftTo(event.target.value)} /></label>
        <button type="submit" className="lens-cta">Apply dates</button>{dateError && <p role="alert" className="lens-date-error">{dateError}</p>}
      </form>}
      <div className="lens-range-caption">{displayWindow(data?.from, data?.to, data?.timezone || timezone)}{query.offset > 0 && " · Previous period " + query.offset}</div>
      {query.filters.length > 0 && <div className="lens-filter-chips">{query.filters.map((filter, index) =>
        <button type="button" key={index} aria-label={"Remove filter " + dimensionLabels[filter.dimension] + " " + filter.value}
          onClick={() => patchQuery({ filters: query.filters.filter((_, i) => i !== index), offset: 0 })}>
          {dimensionLabels[filter.dimension]} {filter.operator || "is"} {filter.value || "(none)"}<X size={12} /></button>)}
        <button type="button" onClick={() => patchQuery({ filters: [], offset: 0 })}>Clear all</button></div>}
      {filterOpen && <form className="lens-filter-form" onSubmit={event => {
        event.preventDefault(); if (query.filters.length >= 5) return;
        patchQuery({ filters: [...query.filters, { dimension: dim, value: value.trim(), operator }], offset: 0 });
        setValue(""); setFilterOpen(false);
      }}><select aria-label="Filter dimension" value={dim} onChange={event => setDim(event.target.value as Dimension)}>
          {dimensions.map(dimension => <option key={dimension} value={dimension}>{dimensionLabels[dimension]}</option>)}</select>
        <select aria-label="Filter operator" value={operator} onChange={event => setOperator(event.target.value as AnalyticsFilter["operator"])}>
          <option value="is">is</option><option value="is_not">is not</option><option value="contains">contains</option><option value="not_contains">does not contain</option></select>
        <input aria-label="Filter value" value={value} maxLength={256} onChange={event => setValue(event.target.value)} placeholder="Value (empty matches none)" />
        <button type="submit" className="lens-cta" disabled={query.filters.length >= 5}>Apply</button></form>}
      {error && <p role="alert" className="lens-error">{error}</p>}
      <section className="lens-card lens-chart-card" aria-busy={loading}>
        <div className="lens-metrics">{metrics.map(item => <div key={item.name}>
          {item.metric ? <button type="button" className={"lens-metric-button " + (metric === item.metric ? "selected" : "")}
            aria-pressed={metric === item.metric} onClick={() => { setMetric(item.metric!); setHover(null); }}>
            <span>{item.name}</span><strong>{item.value}</strong></button> : <><span>{item.name}{item.name === "Online visitors" && !!data?.online && <i />}</span><strong>{item.value}</strong></>}
          {item.change !== null && item.change !== undefined && <small style={{ color: item.change >= 0 ? "#1c9b63" : "#e96a50" }}
            title={"Compared with " + displayWindow(data?.previousFrom, data?.previousTo, data?.timezone || timezone)}>{Math.abs(item.change).toFixed(0)}% {item.change >= 0 ? "↑" : "↓"}</small>}
        </div>)}</div>
        <div className="lens-chart-toolbar"><div className="lens-tabs" aria-label="Chart metric">
          <button type="button" className={metric === "visitors" ? "active" : ""} aria-pressed={metric === "visitors"} onClick={() => { setMetric("visitors"); setHover(null); }}>Visitors</button>
          <button type="button" className={metric === "revenue" ? "active" : ""} aria-pressed={metric === "revenue"} onClick={() => { setMetric("revenue"); setHover(null); }}>Revenue</button>
        </div><span className="lens-muted">{metric === "revenue" ? "USD · verified live payments, net of refunds" : "Unique visitors per time bucket"} · {data?.timezone || timezone}</span></div>
        <div className="lens-chart" onMouseLeave={() => setHover(null)}>
          <svg viewBox="0 0 1000 340" role="img" tabIndex={0}
            aria-label={(metric === "revenue" ? "Verified live revenue" : "Visitor") + " trend. Use left and right arrows to inspect points."}
            onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault();
              setHover(previous => Math.max(0, Math.min(series.length - 1, (previous ?? 0) + (event.key === "ArrowRight" ? 1 : -1)))); } }}
            onMouseMove={event => { const bounds = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - bounds.left) / bounds.width * 1000;
              setHover(Math.max(0, Math.min(series.length - 1, Math.round((x - 50) / 920 * (series.length - 1))))); }}>
            <defs><linearGradient id={chartId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#bfe3ff" stopOpacity=".8" /><stop offset="100%" stopColor="#edf7ff" stopOpacity=".08" /></linearGradient></defs>
            {[0, 1, 2, 3, 4].map(n => <g key={n}><line x1="50" x2="970" y1={60 + n * 60} y2={60 + n * 60} stroke="#e5e5e5" strokeDasharray="3 4" />
              <text x="40" y={65 + n * 60} textAnchor="end" fill="#999" fontSize="10">{metric === "revenue" ? money(maximum * (4 - n) / 4) : Math.round(maximum * (4 - n) / 4)}</text></g>)}
            {series.length > 0 && <><polygon fill={"url(#" + chartId + ")"} points={"50,300 " + points + " 970,300"} />
              <polyline fill="none" stroke="#90cfff" strokeWidth="2.5" points={points} />
              {series.filter((_, index) => index % Math.max(1, Math.ceil(series.length / 7)) === 0).map(row =>
                <text key={row.time} x={pointX(series.indexOf(row))} y="325" fill="#999" fontSize="11" textAnchor="middle">
                  {new Date(row.time).toLocaleString("en-US", { timeZone: data?.timezone || timezone, ...(query.granularity === "daily" ? { month: "short", day: "numeric" } : { hour: "numeric", month: query.period === "today" || query.period === "last24h" ? undefined : "short", day: query.period === "today" || query.period === "last24h" ? undefined : "numeric" }) })}</text>)}</>}
            {hover !== null && series[hover] && <line x1={pointX(hover)} x2={pointX(hover)} y1="40" y2="300" stroke="#a9d4f7" />}
          </svg>
          {hover !== null && series[hover] && <div className="lens-tooltip" role="status">
            {new Date(series[hover].time).toLocaleString("en-US", { timeZone: data?.timezone || timezone })} {data?.timezone || timezone}<strong>{metricValue(series[hover][metric])} {metric === "visitors" ? "visitors" : "revenue"}</strong></div>}
          {!loading && zero && <div className="lens-chart-zero">{metric === "revenue" ? "No verified live revenue in this period." : "No recorded visitors in this period."}
            <small>{metric === "revenue" ? "Sandbox payments never count as live revenue." : "Automated browser visits are excluded."}</small></div>}
        </div>
      </section>
      <div className="lens-grid">
        {breakdown("Sources", [["channel", "Channel"], ["referrer", "Referrer"], ["campaign", "Campaign"]], sourceTab, setSourceTab, true)}
        {breakdown("Pages", [["hostname", "Hostname"], ["path", "Page"], ["entry_path", "Entry page"], ["exit_url", "Exit link"]], pageTab, setPageTab)}
        <AnalyticsCountryCard items={rows("country")} loading={loading} totalVisitors={data?.visitors ?? null}
          disabled={query.filters.length >= 5} onSelect={code => addFilter("country", code)}
          onDetails={() => setDetails({ title: "Countries", dimension: "country" })}/>
        {breakdown("Technology", [["browser", "Browser"], ["os", "OS"], ["device", "Device"]], techTab, setTechTab)}
        <section className="lens-card lens-goals"><div className="lens-tabs"><button type="button" className={goalTab === "goal" ? "active" : ""} onClick={() => setGoalTab("goal")}>Goal</button>
          <button type="button" className={goalTab === "funnel" ? "active" : ""} onClick={() => setGoalTab("funnel")}>Funnel</button></div>
          <h3>{goalTab === "goal" ? "Confirmed payment activity" : "From visits to confirmed payments"}</h3>
          {(goalTab === "funnel" ? data?.funnel || [] : [{ name: "Confirmed payments", count: data?.conversions || 0 }]).map(row =>
            <div className="lens-goal-row" key={row.name}><span>{row.name}</span><strong>{integer(row.count)}</strong></div>)}
          <p className="lens-muted">Revenue comes from verified live payments, after refunds. Sandbox payments are excluded.</p></section>
        <section className="lens-card lens-note"><Globe size={24} /><h3>Real traffic. A clear picture.</h3>
          <p>Click a source, page or device to combine up to five filters. {embedded ? <Link href={"/stats?"+new URLSearchParams({period:query.period,granularity:query.granularity,offset:String(query.offset),filters:JSON.stringify(query.filters),metric,...(query.period==="custom"?{from:query.from,to:query.to}:{})}).toString()}>Open this analytics view to share it.</Link> : "Share this dashboard URL to keep its dates, filters and chart selection."}</p>
          <p className="lens-muted">{showMemberCounts ? "Country totals and voluntarily shared approximate areas appear on the map. Location sharing is optional, expires after 24 hours, and can be removed anytime." : "This website's tracking script uses country totals and does not request browser location."} <Link href="/privacy">Read the privacy details</Link></p></section>
      </div>
      {!embedded && <footer className="lens-footer"><p>Find revenue hiding in your traffic</p><h2>See what brings people to RankBid.</h2>
        <Link className="lens-cta" href="/datafast">Explore RankLens <ArrowUpRight size={15} /></Link>
        <small>Updated {data ? new Date(data.updatedAt).toLocaleTimeString("en-US", { timeZone: data.timezone || timezone }) + " " + (data.timezone || timezone) : "…"} · Verified live revenue only</small></footer>}
    </main>
    {!embedded && <AnalyticsViewControls realtime={false} theme={theme} onRealtimeToggle={() => setRealtime(true)} onThemeToggle={toggleTheme}/>}
    {details&&<div className="lens-modal-backdrop" onClick={event=>{if(event.target===event.currentTarget)setDetails(null);}}><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={chartId+"-details"} className="lens-detail-dialog"><div className="lens-dialog-head"><div><h2 id={chartId+"-details"}>{details.title} · {dimensionLabels[details.dimension]}</h2><p>Recorded unique visitors · up to 30 results</p></div><button type="button" aria-label="Close details" onClick={()=>setDetails(null)}><X size={20}/></button></div><div className="lens-dialog-rows">{rowList(details.dimension,30)}</div><p className="lens-dialog-note">Select a row to filter this dashboard. A visitor can appear in more than one group.</p></div></div>}
  </div>;
}
