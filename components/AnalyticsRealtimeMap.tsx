"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Globe2, Minus, Pause, Play, Plus, Radio, RefreshCw, Share2 } from "lucide-react";
import dynamic from "next/dynamic";
import LocationSharingControl from "./LocationSharingControl";
import AnalyticsViewControls from "./AnalyticsViewControls";
import AnalyticsMemberSummary, { type MembershipTotals } from "./AnalyticsMemberSummary";
import RankBidMark from "./RankBidMark";
import RankLensHomeLink from "./RankLensHomeLink";
import type { AnalyticsActivity, AnalyticsFilter, AnalyticsLocationPoint, Dimension } from "@/lib/analytics-types";

const InteractiveTrafficMap = dynamic(() => import("./InteractiveTrafficMap"), { ssr: false });

interface CountryShape { code: string; name: string; path: string }
interface Breakdown { name: string; value?: string; visitors: number }
interface RealtimeReport {
  visitors: number;
  online: number;
  updatedAt: string;
  breakdowns: Partial<Record<Dimension, Breakdown[]>>;
  realtimeBreakdowns?: Partial<Record<Dimension, Breakdown[]>>;
  sharedLocationPoints?: AnalyticsLocationPoint[];
  recentActivity?: AnalyticsActivity[];
  members?: MembershipTotals;
}
type PanelTab = "referrer" | "country" | "device";
const EMPTY_BREAKDOWN: Breakdown[] = [];

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return seconds + "s ago";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + (minutes === 1 ? " min ago" : " mins ago");
  const hours = Math.floor(minutes / 60);
  return hours + (hours === 1 ? " hr ago" : " hrs ago");
}

function flag(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map(letter => 127397 + letter.charCodeAt(0)));
}

function destinationLabel(value?: string) {
  try { return new URL(value || "").hostname; } catch { return value || "an external site"; }
}

export default function AnalyticsRealtimeMap({
  data, loading, onExit, onFilter, filters, onRemoveFilter, onClearFilters, theme, onThemeToggle, showMemberCounts, error, onRefresh,
}: {
  data: RealtimeReport | null;
  loading: boolean;
  onExit: () => void;
  onFilter: (dimension: Dimension, value: string) => boolean;
  filters: AnalyticsFilter[];
  onRemoveFilter: (index: number) => void;
  onClearFilters: () => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  showMemberCounts: boolean;
  error: string;
  onRefresh: () => void;
}) {
  const [shapes, setShapes] = useState<CountryShape[]>([]);
  const [tab, setTab] = useState<PanelTab>("referrer");
  const [mapCommand, setMapCommand] = useState<{id:number;action:"zoomIn"|"zoomOut"|"reset"|"rotate"}>({id:0,action:"reset"});
  const [mapStatus, setMapStatus] = useState<"loading"|"ready"|"error"|"unsupported">("loading");
  const [rotating, setRotating] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [copyState, setCopyState] = useState("");
  const [filterMessage, setFilterMessage] = useState("");
  const [mapError, setMapError] = useState(false);
  const [mapRetry, setMapRetry] = useState(0);
  const rows = data?.realtimeBreakdowns?.[tab] || data?.breakdowns?.[tab] || [];
  const countryNames = useMemo(() => new Map(shapes.map(country => [country.code, country.name])), [shapes]);
  const countryRows = data?.breakdowns?.country ?? EMPTY_BREAKDOWN;
  const countryCounts = useMemo(() => new Map(countryRows
    .filter(item => item.value !== "Unknown" && item.name !== "Unknown")
    .map(item => [item.value || item.name, item.visitors])), [countryRows]);
  const unknownCountryVisitors = countryRows.find(item => item.value === "Unknown" || item.name === "Unknown")?.visitors || 0;
  const recentActivity = data?.recentActivity || [];
  const sharedLocations = data?.sharedLocationPoints || [];
  const sharedVisitors = sharedLocations.reduce((total, point) => total + point.visitors, 0);
  function command(action:"zoomIn"|"zoomOut"|"reset"|"rotate") { setMapCommand(value => ({id:value.id+1,action})); }

  function selectFilter(dimension: Dimension, value: string) {
    if (onFilter(dimension, value)) setFilterMessage("");
    else setFilterMessage(filters.length >= 5 ? "You can use up to five filters. Remove one to add another." : "That filter is already selected.");
  }

  useEffect(() => {
    let cancelled = false;
    setMapError(false);
    fetch("/maps/world-countries.json", { cache: "force-cache" })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Map unavailable")))
      .then((result: { countries?: CountryShape[] }) => {
        if (!Array.isArray(result.countries) || !result.countries.length) throw new Error("Map unavailable");
        if (!cancelled) setShapes(result.countries);
      })
      .catch(() => { if (!cancelled) setMapError(true); });
    return () => { cancelled = true; };
  }, [mapRetry]);

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("Copied");
    } catch {
      setCopyState("Copy the address bar link");
    }
    window.setTimeout(() => setCopyState(""), 2200);
  }

  function countryName(code: string) {
    return code === "Unknown" ? "Unknown location" : countryNames.get(code) || code;
  }

  const tabs: { id: PanelTab; label: string; dimension: Dimension }[] = [
    { id: "referrer", label: "Referrers", dimension: "referrer" },
    { id: "country", label: "Countries", dimension: "country" },
    { id: "device", label: "Devices", dimension: "device" },
  ];

  return <main className={"lens-live-map lens-live-" + theme} aria-label="RankLens realtime analytics map">
    <div className="lens-live-map-art">
      <InteractiveTrafficMap key={mapRetry} countryCounts={countryCounts} sharedLocationPoints={sharedLocations} theme={theme}
        command={mapCommand} onStatus={setMapStatus} onRotationChange={setRotating}
        onCountrySelect={code => selectFilter("country", code)} />
      {(mapStatus !== "ready" || (!countryCounts.size && !sharedLocations.length)) && <div className="lens-live-map-empty" role={mapStatus === "error" ? "alert" : "status"}>
        {mapStatus === "unsupported" ? "Interactive maps need WebGL. The basic globe is shown instead." : mapStatus === "error" || mapError ? <>Detailed map could not load. Check your connection. <button type="button" onClick={() => { setMapStatus("loading"); setMapRetry(value => value + 1); }}>Retry map</button></> : mapStatus === "loading" ? "Loading interactive world map…" : loading ? "Loading visitor totals…" : unknownCountryVisitors > 0
          ? "Location appears when a visitor chooses Share location, or their country is available from the hosting provider."
          : "Explore the world. Visitor markers appear when location data is available."}
      </div>}
      <div className="lens-live-map-attribution">Drag to explore · Scroll or pinch to zoom · Blue: country totals · Orange: shared approximate areas</div>
    </div>

    <section className={"lens-live-summary" + (summaryOpen ? " lens-live-summary-expanded" : "")} aria-label="Realtime traffic summary">
      <div className="lens-live-brand-row">
        <a className="lens-live-brand" href="/datafast" aria-label="RankLens home"><RankBidMark size={27} />RankLens</a>
        <button type="button" className="lens-live-icon-button" onClick={() => void copyShareLink()} aria-label="Copy realtime share link" title="Copy share link"><Share2 size={16}/></button>
        <button type="button" className="lens-live-icon-button" onClick={() => command("zoomIn")} aria-label="Zoom in"><Plus size={16}/></button>
        <button type="button" className="lens-live-icon-button" onClick={() => command("zoomOut")} aria-label="Zoom out"><Minus size={16}/></button>
        <button type="button" className="lens-live-icon-button" onClick={onExit} aria-label="Return to analytics dashboard" title="Dashboard"><ArrowLeft size={16}/></button>
      </div>
      <div className="lens-live-map-tools">
        <RankLensHomeLink />
        <button type="button" onClick={() => command("reset")}><Globe2 size={13}/>World view</button>
        <button type="button" aria-pressed={rotating} onClick={() => command("rotate")}>{rotating ? <Pause size={12}/> : <Play size={12}/>} {rotating ? "Pause rotation" : "Rotate globe"}</button>
        <button type="button" className="lens-live-summary-toggle" aria-expanded={summaryOpen} onClick={() => setSummaryOpen(value => !value)}>{summaryOpen ? "Less" : "Details"}</button>
      </div>
      <p className="lens-live-mobile-totals">{data?.online ?? "—"} visitors online{showMemberCounts ? ` · ${data?.members?.total ?? "—"} members · ${data?.members?.online ?? "—"} members online` : ""}</p>
      <div className="lens-live-summary-details">
      <div className="lens-live-heading">
        {!showMemberCounts && <strong><i className={data?.online ? "" : "inactive"}/> {data ? data.online.toLocaleString("en-US") : "—"} visitors online</strong>}
        <span>{data ? data.visitors.toLocaleString("en-US") : "—"} visitors in selected period</span>
        <span className="lens-live-refresh"><Radio size={12}/> Country activity · last hour</span>
      </div>
      {showMemberCounts && <AnalyticsMemberSummary compact members={data?.members} onlineVisitors={data?.online}/>}
      {showMemberCounts && <div className="lens-live-sharing"><span>{sharedVisitors} visitors sharing · {sharedLocations.length} approximate areas</span><LocationSharingControl compact /></div>}
      {error && <p className="lens-live-error" role="alert">{error}<button type="button" onClick={onRefresh}><RefreshCw size={12}/>Retry</button></p>}
      {!!filters.length && <div className="lens-live-filter-row" aria-label="Active filters">
        {filters.map((filter, index) => <button type="button" key={index} aria-label={`Remove ${filter.dimension} filter ${filter.value || "(none)"}`}
          onClick={() => onRemoveFilter(index)}>{filter.dimension.replaceAll("_", " ")} {filter.operator || "is"} {filter.value || "(none)"}<span aria-hidden="true">×</span></button>)}
        <button type="button" className="lens-live-clear-filters" onClick={onClearFilters}>Clear all</button>
      </div>}
      {filterMessage && <p className="lens-live-filter-message" role="status">{filterMessage}</p>}
      <div className="lens-live-tabs" role="tablist" aria-label="Realtime breakdown">
        {tabs.map(item => <button type="button" key={item.id} role="tab" aria-selected={tab === item.id}
          className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </div>
      <div className="lens-live-breakdown" role="tabpanel">
        {rows.length ? rows.slice(0, 7).map(row => {
          const value = row.value ?? row.name;
          const label = tab === "country" ? countryName(value) : tab === "referrer" && value === "" ? "Direct" : row.name || "(none)";
          return <button type="button" className="lens-live-row" key={value || "(none)"}
            onClick={() => selectFilter(tabs.find(item => item.id === tab)!.dimension, value)}>
            <span className="lens-live-row-name">{tab === "country" && flag(value)}{label}</span>
            <span>{row.visitors}</span>
          </button>;
        }) : <p className="lens-live-empty">{loading ? "Loading live totals…" : "No activity recorded in this period yet."}</p>}
      </div>
      {copyState && <p className="lens-live-copy-state" role="status"><Copy size={13}/>{copyState}</p>}
      <p className="lens-live-updated">Updated {data ? new Date(data.updatedAt).toLocaleTimeString("en-US", { timeZone: "UTC" }) + " UTC" : "…"}</p>
      </div>
    </section>

    <section className="lens-live-activity" aria-label="Recent activity">
      <h2><span><i/> Live activity</span><small>{recentActivity.length} events · last hour</small></h2>
      <div className="lens-live-activity-list" aria-live="polite">
        {recentActivity.length ? recentActivity.map((item, index) => {
          const code = item.country || "Unknown";
          return <article className="lens-live-event" key={item.createdAt + item.path + index}>
            <span className="lens-live-event-icon" aria-hidden="true">{item.type === "exit" ? "↗" : "◉"}</span>
            <p><strong>Anonymous visitor{code !== "Unknown" ? " from " + countryName(code) : ""}</strong>
              {item.type === "exit" ? <> exited to <b>{destinationLabel(item.destination)}</b></> : <> visited <b>{item.path}</b></>}
              <small>{relativeTime(item.createdAt)} · {item.device || "Unknown device"}</small></p>
          </article>;
        }) : <p className="lens-live-empty">{loading ? "Waiting for activity…" : "No recent visits in this period."}</p>}
      </div>
    </section>
    <AnalyticsViewControls realtime theme={theme} onRealtimeToggle={onExit} onThemeToggle={onThemeToggle}/>
  </main>;
}
