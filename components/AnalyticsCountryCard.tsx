"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Maximize2 } from "lucide-react";

interface CountryItem { name: string; value?: string; visitors: number }
interface CountryShape { code: string; name: string; path: string }
interface Props {
  items: CountryItem[];
  loading: boolean;
  totalVisitors: number | null;
  disabled: boolean;
  onSelect: (code: string) => void;
  onDetails: () => void;
}

const count = (value: number) => new Intl.NumberFormat("en-US").format(value);
function flag(code: string) {
  return /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map(letter => 127397 + letter.charCodeAt(0)))
    : "";
}

export default function AnalyticsCountryCard({ items, loading, totalVisitors, disabled, onSelect, onDetails }: Props) {
  const [tab, setTab] = useState<"map" | "country">("map");
  const [shapes, setShapes] = useState<CountryShape[]>([]);
  const [mapError, setMapError] = useState(false);
  const id = "countries-" + useId().replace(/:/g, "");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/maps/world-countries.json", { cache: "force-cache", signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Map unavailable")))
      .then((map: { countries?: CountryShape[] }) => {
        if (!Array.isArray(map.countries)) throw new Error("Map unavailable");
        setShapes(map.countries.filter(shape => typeof shape.code === "string" && typeof shape.name === "string" && typeof shape.path === "string"));
      })
      .catch(() => { if (!controller.signal.aborted) setMapError(true); });
    return () => controller.abort();
  }, []);

  const names = useMemo(() => new Map(shapes.map(shape => [shape.code, shape.name])), [shapes]);
  const countryRows = useMemo(() => items
    .filter(item => Number.isFinite(item.visitors) && item.visitors > 0)
    .map(item => {
      const code = item.value ?? item.name;
      let name = names.get(code) || item.name;
      if (code === "Unknown") name = "Unknown country";
      else if (/^[A-Z]{2}$/.test(code) && (!name || name === code)) {
        try { name = new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code; } catch { name = code; }
      }
      return { code, name, visitors: item.visitors };
    }).sort((one, two) => two.visitors - one.visitors || one.name.localeCompare(two.name)), [items, names]);
  const totals = useMemo(() => new Map(countryRows.map(item => [item.code, item.visitors])), [countryRows]);
  const maximum = Math.max(1, ...countryRows.map(item => item.visitors));
  const knownVisitors = countryRows.filter(item => /^[A-Z]{2}$/.test(item.code)).reduce((sum, item) => sum + item.visitors, 0);
  const unknownVisitors = countryRows.find(item => item.code === "Unknown")?.visitors || 0;

  return <section className="lens-card lens-breakdown lens-country-card" aria-label="Visitor countries">
    <div className="lens-card-head">
      <div className="lens-tabs" role="tablist" aria-label="Country view" onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? "map" : event.key === "End" ? "country" : tab === "map" ? "country" : "map";
        setTab(next);
        event.currentTarget.querySelector<HTMLButtonElement>("#" + id + "-" + next)?.focus();
      }}>
        {(["map", "country"] as const).map(value => <button type="button" key={value} id={id + "-" + value}
          role="tab" aria-selected={tab === value} aria-controls={id + "-panel"} tabIndex={tab === value ? 0 : -1}
          className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value === "map" ? "Map" : "Country"}</button>)}
      </div>
      <span className="lens-muted">{totalVisitors === null ? "—" : count(totalVisitors)} visitors</span>
    </div>
    <div id={id + "-panel"} role="tabpanel" aria-labelledby={id + "-" + tab}>
      {tab === "map" ? <div className="lens-country-map">
        {shapes.length ? <svg viewBox="0 0 900 450" role="group" aria-label="World map showing recorded country totals">
          {shapes.map(shape => {
            const visitors = totals.get(shape.code) || 0;
            const active = visitors > 0;
            return <path key={shape.code} d={shape.path}
              className={"lens-country-shape" + (active ? " lens-country-shape-active" : "")}
              style={{ fillOpacity: active ? .4 + .6 * visitors / maximum : 1 }}
              role={active ? "button" : undefined} tabIndex={active && !disabled ? 0 : undefined}
              aria-disabled={active ? disabled : undefined}
              aria-label={active ? shape.name + ": " + count(visitors) + " visitors. Filter this country." : undefined}
              onClick={active && !disabled ? () => onSelect(shape.code) : undefined}
              onKeyDown={active && !disabled ? event => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(shape.code); }
              } : undefined}>
              <title>{shape.name + (active ? " · " + count(visitors) + " visitors" : " · no recorded country visits")}</title>
            </path>;
          })}
        </svg> : <div className="lens-empty">{mapError ? "Map unavailable. Select Country to see recorded totals." : "Loading country map…"}</div>}
        {!loading && shapes.length > 0 && !knownVisitors && <p className="lens-country-empty">No country totals recorded in this period.</p>}
      </div> : <div className="lens-rows">
        {countryRows.length ? countryRows.slice(0, 10).map(item => <button type="button" key={item.code}
          className="lens-row" disabled={disabled} onClick={() => onSelect(item.code)} title={"Filter Country: " + item.name}>
          <span className="lens-bar" style={{ width: item.visitors / maximum * 100 + "%" }} />
          <span className="lens-row-name"><span className="lens-country-flag" aria-hidden="true">{flag(item.code)}</span>{item.name}</span>
          <span className="lens-row-value">{count(item.visitors)}</span>
        </button>) : <div className="lens-empty">{loading ? "Loading country totals…" : "No visitors recorded in this period."}</div>}
      </div>}
    </div>
    <p className="lens-country-footnote">Country-level totals only.{unknownVisitors > 0 ? " " + count(unknownVisitors) + " visitors have an unknown country." : " Select a country to filter visits."}</p>
    <button type="button" className="lens-details" disabled={!countryRows.length} onClick={onDetails}>
      <Maximize2 size={12}/> DETAILS
    </button>
  </section>;
}
