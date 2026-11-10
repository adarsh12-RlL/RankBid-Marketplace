"use client";

import { Globe, Lightbulb } from "lucide-react";

export default function AnalyticsViewControls({
  realtime, theme, onRealtimeToggle, onThemeToggle,
}: {
  realtime: boolean;
  theme: "light" | "dark";
  onRealtimeToggle: () => void;
  onThemeToggle: () => void;
}) {
  const mapLabel = realtime ? "Return to analytics dashboard" : "Open realtime globe";
  const themeLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return <nav className={"lens-floating-controls lens-floating-" + theme + (realtime ? " lens-floating-live" : "")}
    aria-label="Analytics view options">
    <button type="button" className={realtime ? "active" : ""} onClick={onRealtimeToggle}
      aria-label={mapLabel} aria-pressed={realtime} title={mapLabel}>
      <Globe size={23} strokeWidth={1.6} aria-hidden="true"/><span>{mapLabel}</span>
    </button>
    <button type="button" onClick={onThemeToggle} aria-label={themeLabel}
      aria-pressed={theme === "light"} title={themeLabel}>
      <Lightbulb size={23} strokeWidth={1.6} aria-hidden="true"/><span>{themeLabel}</span>
    </button>
  </nav>;
}
