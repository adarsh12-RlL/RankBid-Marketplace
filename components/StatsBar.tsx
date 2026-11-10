"use client";
import { useEffect, useState } from "react";
export default function StatsBar() {
  const [s, setS] = useState<any>(null);
  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (active) setS(d);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-2 text-xs text-gray-600 dark:text-gray-300 flex flex-wrap gap-x-5 gap-y-1">
        {s ? (
          <>
            <strong>
              {s.mode === "disabled"
                ? "Payments unavailable"
                : s.isTest
                  ? "Sandbox / test mode — no real money"
                  : "Live paid placements"}
            </strong>
            <span>{s.totalProducts} verified placements</span>
            <span>
              ${Number(s.totalRevenue).toFixed(2)}{" "}
              {s.isTest ? "test volume" : "recorded payments"}
            </span>
            <span>{s.totalClicks} recorded outbound clicks</span>
          </>
        ) : (
          <span>Paid placements · No traffic or sales guarantees</span>
        )}
      </div>
    </div>
  );
}
