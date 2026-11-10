"use client";

import { useId, useMemo, useState } from "react";

export interface AnalyticsSourceItem { name: string; value?: string; visitors: number }
interface Props {
  items: AnalyticsSourceItem[];
  totalVisitors: number;
  dimensionLabel?: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
}
interface Segment extends AnalyticsSourceItem {
  key: string; start: number; end: number; middle: number; share: number; color: string;
}

const TAU = Math.PI * 2;
const CX = 260, CY = 180, OUTER = 127, INNER = 86;
const fallbackColors = ["#8bc9f8", "#6db4e6", "#b0dafa", "#cce8fc", "#5a9ac9", "#a4c9e0", "#c6d5df", "#e0e8ed"];
const point = (radius: number, angle: number) => ({ x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) });
const coordinate = (value: number) => Number(value.toFixed(3));
const pair = (p: { x: number; y: number }) => coordinate(p.x) + " " + coordinate(p.y);
function sectorPath(segment: Segment) {
  const gap = Math.min(.016, (segment.end - segment.start) * .22);
  const start = segment.start + gap / 2, end = segment.end - gap / 2;
  const large = end - start > Math.PI ? 1 : 0;
  return "M " + pair(point(OUTER, start)) + " A " + OUTER + " " + OUTER + " 0 " + large + " 1 " + pair(point(OUTER, end)) +
    " L " + pair(point(INNER, end)) + " A " + INNER + " " + INNER + " 0 " + large + " 0 " + pair(point(INNER, start)) + " Z";
}
const count = (value: number) => new Intl.NumberFormat("en-US").format(value);
const shortLabel = (value: string) => value.length > 22 ? value.slice(0, 20) + "…" : value;

export default function AnalyticsSourcesChart({ items, totalVisitors, dimensionLabel = "Source", onSelect, disabled = false, loading = false }: Props) {
  const chartId = "sources-" + useId().replace(/:/g, "");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const segments = useMemo(() => {
    const recorded = items.filter(item => typeof item.name === "string" && Number.isFinite(item.visitors) && item.visitors > 0);
    const sum = recorded.reduce((total, item) => total + item.visitors, 0);
    let angle = -Math.PI / 2;
    return recorded.map((item, index): Segment => {
      const share = item.visitors / sum, start = angle;
      angle += share * TAU;
      return { ...item, key: item.value ?? item.name, start, end: angle, middle: (start + angle) / 2, share,
        color: "var(--lens-chart-" + (index % fallbackColors.length + 1) + ", " + fallbackColors[index % fallbackColors.length] + ")" };
    });
  }, [items]);
  const labels = useMemo(() => {
    const result = segments.filter(segment => segment.share >= .04).slice(0, 6).map(segment => {
      const outer = point(OUTER + 8, segment.middle), elbow = point(OUTER + 24, segment.middle);
      return { segment, outer, elbow, right: Math.cos(segment.middle) >= 0, y: elbow.y };
    });
    for (const right of [false, true]) {
      const side = result.filter(label => label.right === right).sort((a, b) => a.y - b.y);
      for (let index = 0; index < side.length; index++) side[index].y = Math.max(index ? side[index - 1].y + 25 : 31, side[index].y);
      if (side.length && side[side.length - 1].y > 329) {
        side[side.length - 1].y = 329;
        for (let index = side.length - 2; index >= 0; index--) side[index].y = Math.min(side[index].y, side[index + 1].y - 25);
      }
    }
    return result;
  }, [segments]);
  const active = segments.find(segment => segment.key === activeKey);
  const activate = (segment: Segment) => { if (!disabled) onSelect(segment.key); };
  return <div className="lens-source-chart" style={{ position: "relative", width: "100%", aspectRatio: "520 / 360" }}>
    <svg viewBox="0 0 520 360" role="group" aria-labelledby={chartId + "-title " + chartId + "-description"}
      style={{ display: "block", width: "100%", height: "100%" }}>
      <title id={chartId + "-title"}>{dimensionLabel + " distribution"}</title>
      <desc id={chartId + "-description"}>{count(Number.isFinite(totalVisitors) ? totalVisitors : 0) + " recorded visitors. Segments use recorded source counts, which can overlap. Focus a segment for its count; press Enter to filter it."}</desc>
      <circle cx={CX} cy={CY} r={(OUTER + INNER) / 2} fill="none" stroke="var(--lens-chart-neutral, #edf1f4)" strokeWidth={OUTER - INNER} />
      {segments.map(segment => <g key={segment.key} role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled}
        aria-label={segment.name + ": " + count(segment.visitors) + " visitors. Filter " + dimensionLabel.toLowerCase() + "."}
        style={{ cursor: disabled ? "default" : "pointer", outline: "none" }}
        onMouseEnter={() => setActiveKey(segment.key)} onMouseLeave={() => setActiveKey(null)}
        onFocus={() => setActiveKey(segment.key)} onBlur={() => setActiveKey(null)}
        onClick={() => activate(segment)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(segment); } }}>
        {segments.length === 1 ? <circle cx={CX} cy={CY} r={(OUTER + INNER) / 2} fill="none" stroke={segment.color} strokeWidth={OUTER - INNER} opacity={!active || active.key === segment.key ? 1 : .65} /> :
          <path d={sectorPath(segment)} fill={segment.color} stroke="var(--lens-card, #fff)" strokeWidth="2.5" strokeLinejoin="round" opacity={!active || active.key === segment.key ? 1 : .65} />}
        {active?.key === segment.key && <circle cx={CX} cy={CY} r={OUTER + 3} fill="none" stroke={segment.color} strokeWidth="1.5" opacity=".65" pointerEvents="none" />}
        <title>{segment.name + ": " + count(segment.visitors) + " visitors"}</title>
      </g>)}
      {labels.map(({ segment, outer, elbow, right, y }) => {
        const x = right ? Math.max(398, elbow.x + 10) : Math.min(122, elbow.x - 10);
        return <g key={segment.key} aria-hidden="true" style={{ cursor: disabled ? "default" : "pointer" }} onClick={() => activate(segment)}
          onMouseEnter={() => setActiveKey(segment.key)} onMouseLeave={() => setActiveKey(null)}>
          <path d={"M " + pair(outer) + " L " + coordinate(elbow.x) + " " + coordinate(y) + " L " + coordinate(x + (right ? -5 : 5)) + " " + coordinate(y)}
            fill="none" stroke={segment.color} strokeWidth="1.5" />
          <text x={x} y={y + 4} textAnchor={right ? "start" : "end"} fill="var(--lens-text, #334155)" fontSize="11.5"
            textLength={segment.name.length >= 18 ? 116 : undefined} lengthAdjust="spacingAndGlyphs">{shortLabel(segment.name)}</text>
        </g>;
      })}
      {!segments.length && <text x={CX} y={CY} textAnchor="middle" fill="var(--lens-muted, #8b949e)" fontSize="13">{loading ? "Loading sources…" : "No source data"}</text>}
    </svg>
    {active && <div className="lens-source-tooltip" role="status" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none", maxWidth: 180, border: "1px solid var(--lens-border, #e3e7eb)", borderRadius: 7, background: "var(--lens-tooltip-bg, var(--lens-card, #fff))", color: "var(--lens-text, #334155)", padding: "8px 12px", fontSize: 12, textAlign: "center", boxShadow: "0 4px 16px #0000000b" }}>
      <span style={{ display: "block", marginBottom: 4 }}>{active.name}</span><strong>{count(active.visitors)} visitors</strong>
    </div>}
  </div>;
}
