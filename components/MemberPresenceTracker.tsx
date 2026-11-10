"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function MemberPresenceTracker() {
  const path = usePathname();
  useEffect(() => {
    if (!path || navigator.webdriver) return;
    function ping() {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/presence", {
        method: "POST", credentials: "same-origin", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: "{}",
      }).catch(() => {});
    }
    ping();
    const timer = window.setInterval(ping, 30000);
    document.addEventListener("visibilitychange", ping);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", ping); };
  }, [path]);
  return null;
}
