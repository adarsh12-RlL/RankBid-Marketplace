"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, ShieldCheck, X } from "lucide-react";
import styles from "./LocationSharingControl.module.css";

const STORAGE_KEY = "rankbid_location_sharing_expiry";
const CHANGE_EVENT = "rankbid-location-change";
const DAY = 86400000;

function storedExpiry() {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > Date.now() ? value : 0;
  } catch { return 0; }
}

export default function LocationSharingControl({ compact = false }: { compact?: boolean }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const [busy, setBusy] = useState<"" | "locating" | "saving" | "removing">("");
  const [message, setMessage] = useState("");
  const [needsSession, setNeedsSession] = useState(false);
  const [secure, setSecure] = useState(true);
  const requestVersion = useRef(0);
  const expiryRef = useRef(0);
  const busyRef = useRef("");
  expiryRef.current = expiresAt;
  busyRef.current = busy;

  function rememberExpiry(value: number) {
    setExpiresAt(value);
    try {
      if (value) localStorage.setItem(STORAGE_KEY, String(value));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { expiresAt: value, source: panelId } }));
  }

  async function removeLocation(revoked = false) {
    if (busyRef.current) return;
    // Invalidate a pending permission callback or save before withdrawing. A
    // save that finishes after DELETE is cleaned up below before UI resync.
    requestVersion.current++;
    setBusy("removing");
    try {
      const response = await fetch("/api/analytics/location", { method: "DELETE", credentials: "same-origin" });
      if (!response.ok && response.status !== 401) throw new Error("Removal failed");
      rememberExpiry(0);
      setMessage(revoked ? "Browser permission was revoked. Your shared location has been removed." : "Your location has been removed from the visitor map.");
    } catch {
      setMessage("Could not remove the location. Please retry; it also expires automatically within 24 hours.");
    } finally { setBusy(""); }
  }

  useEffect(() => {
    let cancelled = false;
    const syncVersion = requestVersion.current;
    setSecure(window.isSecureContext);
    setExpiresAt(storedExpiry());
    function syncLocal(event: Event) {
      if (event instanceof StorageEvent && event.key !== STORAGE_KEY && event.key !== null) return;
      const ownChange = event instanceof CustomEvent && event.detail?.source === panelId;
      const sharedExpiry = event instanceof CustomEvent ? event.detail?.expiresAt : undefined;
      const next = typeof sharedExpiry === "number" && Number.isFinite(sharedExpiry) && sharedExpiry > Date.now() ? sharedExpiry : storedExpiry();
      if (!ownChange && next === 0 && (expiryRef.current > 0 || busyRef.current === "locating" || busyRef.current === "saving")) {
        requestVersion.current++;
        if (busyRef.current === "locating" || busyRef.current === "saving") {
          setBusy("");
          setMessage("Location sharing was cancelled because the saved location was removed in another tab.");
        }
      }
      setExpiresAt(next);
    }
    function expireLocal() {
      if (expiryRef.current && expiryRef.current <= Date.now()) {
        setExpiresAt(0);
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
      }
    }
    void fetch("/api/analytics/location", { cache: "no-store", credentials: "same-origin" })
      .then(async (response): Promise<{ shared: boolean; expiresAt?: string } | null> => {
        if (response.status === 401) return { shared: false };
        if (!response.ok) return null;
        return response.json() as Promise<{ shared: boolean; expiresAt?: string }>;
      })
      .then(result => {
        if (cancelled || !result || requestVersion.current !== syncVersion || busyRef.current) return;
        const serverExpiry = result.shared && result.expiresAt ? new Date(result.expiresAt).getTime() : 0;
        const next = Number.isFinite(serverExpiry) && serverExpiry > Date.now() ? serverExpiry : 0;
        setExpiresAt(next);
        try { if (next) localStorage.setItem(STORAGE_KEY, String(next)); else localStorage.removeItem(STORAGE_KEY); } catch {}
      }).catch(() => {});
    window.addEventListener("storage", syncLocal);
    window.addEventListener(CHANGE_EVENT, syncLocal);
    const timer = window.setInterval(expireLocal, 15000);
    return () => {
      cancelled = true;
      // Invalidate permission/fetch callbacks that could otherwise update an unmounted panel.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestVersion.current++;
      window.clearInterval(timer);
      window.removeEventListener("storage", syncLocal);
      window.removeEventListener(CHANGE_EVENT, syncLocal);
    };
  }, [panelId]);

  useEffect(() => {
    if (!expiresAt || !navigator.permissions?.query) return;
    let permission: PermissionStatus | undefined;
    let cancelled = false;
    function onPermissionChange() {
      if (!cancelled && permission?.state === "denied" && expiryRef.current) void removeLocation(true);
    }
    void navigator.permissions.query({ name: "geolocation" }).then(result => {
      if (cancelled) return;
      permission = result;
      permission.addEventListener("change", onPermissionChange);
      onPermissionChange();
    }).catch(() => {});
    return () => { cancelled = true; permission?.removeEventListener("change", onPermissionChange); };
    // Permission changes need the current values in refs, not a new browser query each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  function shareLocation() {
    setMessage(""); setNeedsSession(false);
    if (!window.isSecureContext) { setMessage("Location sharing needs HTTPS or localhost. Open the secure website to continue."); return; }
    if (!navigator.geolocation) { setMessage("This browser does not support location sharing."); return; }
    const version = ++requestVersion.current;
    setBusy("locating");
    navigator.geolocation.getCurrentPosition(position => {
      if (version !== requestVersion.current) return;
      // Exact browser coordinates never leave this callback. Only the rounded cell is sent.
      const latitude = Math.round(position.coords.latitude * 10) / 10;
      const longitude = Math.round(position.coords.longitude * 10) / 10;
      setBusy("saving");
      void fetch("/api/analytics/location", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, consent: "approximate-public-v1" }),
      }).then(async response => {
        if (!response.ok) {
          if (version !== requestVersion.current) return;
          if (response.status === 401) { setNeedsSession(true); throw new Error("session"); }
          throw new Error("save");
        }
        const result = await response.json() as { expiresAt?: string };
        if (version !== requestVersion.current) {
          // If withdrawal raced an already-sent POST, remove its late write.
          void fetch("/api/analytics/location", { method: "DELETE", credentials: "same-origin", keepalive: true }).catch(() => {});
          return;
        }
        const serverExpiry = result.expiresAt ? new Date(result.expiresAt).getTime() : Date.now() + DAY;
        rememberExpiry(Number.isFinite(serverExpiry) ? serverExpiry : Date.now() + DAY);
        setMessage("Your approximate location is now shared. You can remove it below.");
      }).catch(error => {
        if (version !== requestVersion.current) return;
        setMessage(error instanceof Error && error.message === "session"
          ? "Open the RankBid homepage once to start your anonymous visitor session, then retry sharing."
          : "Your location could not be saved. Please retry. No successful sharing was confirmed.");
      }).finally(() => { if (version === requestVersion.current) setBusy(""); });
    }, error => {
      if (version !== requestVersion.current) return;
      setBusy("");
      setMessage(error.code === 1 ? "Location permission was not allowed. You can continue using RankBid."
        : error.code === 3 ? "The location request timed out. Please retry when ready."
        : "Your browser could not find your location. Check your device location settings and retry.");
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
  }

  const active = expiresAt > 0;
  return <div className={`${styles.control} ${compact ? styles.compact : ""}`}>
    <button type="button" className={styles.trigger} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
      {active ? <ShieldCheck size={14} /> : <MapPin size={14} />}{active ? "Location shared" : "Share location"}
    </button>
    {open && <section id={panelId} className={styles.panel} aria-label="Optional location sharing">
      <div className={styles.heading}><strong>Share your approximate location</strong><button type="button" className={styles.close} aria-label="Close location sharing" onClick={() => setOpen(false)}><X size={15} /></button></div>
      <p>Share an approximate location on the public visitor map for 24 hours. Coordinates are rounded to a 0.1° grid, about 10 km at the equator. Your name and email are not displayed. You can remove it anytime.</p>
      <p className={styles.note}>Sharing captures your location once. The browser asks for permission after you choose Allow sharing. Other visitors in the same area appear as a combined count.</p>
      {!secure && <p className={styles.status}>Location sharing needs HTTPS or localhost.</p>}
      {active ? <>
        <p className={styles.status}>Shared until {new Date(expiresAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.</p>
        <button type="button" className={styles.action} disabled={!!busy} onClick={() => void removeLocation()}>{busy === "removing" ? "Removing…" : "Remove my location"}</button>
      </> : <button type="button" className={styles.action} disabled={!!busy || !secure} onClick={shareLocation}>
        {busy === "locating" ? "Waiting for browser location…" : busy === "saving" ? "Saving approximate location…" : "Allow sharing"}
      </button>}
      {message && <p className={styles.status} role="status">{message}{needsSession && <> <Link href="/" className={styles.link}>Open homepage</Link></>}</p>}
      <Link href="/privacy" className={styles.link}>Privacy details</Link>
    </section>}
  </div>;
}
