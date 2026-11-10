"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface Attribution { campaign: string; referrer: string }
const SESSION_KEY = "rankbid_analytics_session";
const ATTRIBUTION_KEY = "rankbid_analytics_attribution";
function firstAttribution(): Attribution {
  let referrer = "";
  try { const url = new URL(document.referrer); if (url.origin !== location.origin && ["http:", "https:"].includes(url.protocol)) referrer = url.origin; } catch {}
  return { campaign: (new URLSearchParams(location.search).get("utm_campaign") || "").slice(0, 100), referrer };
}
export default function AnalyticsTracker() {
  const path = usePathname();
  const sessionRef = useRef(""), attributionRef = useRef<Attribution | null>(null);
  useEffect(() => {
    if (!path || /^\/(api|admin|stats|datafast|login)(\/|$)/.test(path) || navigator.webdriver) return;
    if (!sessionRef.current) {
      let stored = "";
      try { stored = sessionStorage.getItem(SESSION_KEY) || ""; } catch {}
      sessionRef.current = /^[a-f0-9]{32}$/.test(stored) ? stored : crypto.randomUUID().replaceAll("-", "");
      if (!stored || !/^[a-f0-9]{32}$/.test(stored)) {
        attributionRef.current = firstAttribution();
        try { sessionStorage.setItem(SESSION_KEY, sessionRef.current); sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attributionRef.current)); } catch {}
      }
    }
    if (!attributionRef.current) {
      try {
        const parsed = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || "null") as Attribution | null;
        if (parsed && typeof parsed.campaign === "string" && typeof parsed.referrer === "string") {
          let referrer = "";
          try { const url = new URL(parsed.referrer); if (["https:", "http:"].includes(url.protocol) && url.origin !== location.origin) referrer = url.origin; } catch {}
          attributionRef.current = { campaign: parsed.campaign.slice(0, 100), referrer };
        }
      } catch {}
      if (!attributionRef.current) attributionRef.current = firstAttribution();
      try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attributionRef.current)); } catch {}
    }
    const session = sessionRef.current, attribution = attributionRef.current;
    let eventId = 0, cancelled = false, activeMilliseconds = 0;
    let activeSince: number | null = document.visibilityState === "visible" ? performance.now() : null;
    function duration() {
      return Math.max(0, Math.floor(activeMilliseconds + (activeSince === null ? 0 : performance.now() - activeSince)));
    }
    function ping(force = false) {
      if (!eventId || cancelled || (!force && document.visibilityState !== "visible")) return;
      const payload = JSON.stringify({ type: "heartbeat", eventId, session, duration: duration() });
      try { if (navigator.sendBeacon?.("/api/analytics/events", new Blob([payload], { type: "application/json" }))) return; } catch {}
      void fetch("/api/analytics/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
    }
    function visibility() {
      if (document.visibilityState === "hidden") {
        if (activeSince !== null) activeMilliseconds += performance.now() - activeSince;
        activeSince = null; ping(true);
      } else if (activeSince === null) { activeSince = performance.now(); ping(); }
    }
    void fetch("/api/analytics/events", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ session, path, referrer: attribution.referrer, campaign: attribution.campaign }) })
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (!cancelled && Number.isSafeInteger(result?.eventId)) eventId = result.eventId; })
      .catch(() => {});
    function recordExit(event: MouseEvent) {
      if (cancelled || event.defaultPrevented || (event.button !== 0 && event.button !== 1)) return;
      const element = event.target instanceof Element ? event.target : null;
      const anchor = element?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      try {
        const destination = new URL(anchor.href, location.href);
        if (!["http:", "https:"].includes(destination.protocol) || destination.origin === location.origin) return;
        // Send only a real destination origin: provider/auth tokens may be in paths.
        const payload = JSON.stringify({ type: "exit", session, path, url: destination.origin });
        try { if (navigator.sendBeacon?.("/api/analytics/events", new Blob([payload], { type: "application/json" }))) return; } catch {}
        void fetch("/api/analytics/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
      } catch {}
    }
    document.addEventListener("click", recordExit);
    document.addEventListener("auxclick", recordExit);
    const pagehide = () => ping(true);
    const timer = setInterval(() => ping(), 30000);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pagehide);
    return () => {
      ping(true); cancelled = true; clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", pagehide);
      document.removeEventListener("click", recordExit); document.removeEventListener("auxclick", recordExit);
    };
  }, [path]);
  return null;
}
