"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, Trophy, Flame } from "lucide-react";
import { money } from "./leaderboard-ui";

interface ActivityItem {
  id: number;
  product: { id: number; name: string; category: string };
  amountCents: number;
  confirmedAt: string;
  currentOverallRank: number | null;
}

export default function LiveTicker() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    let alive = true;
    async function fetchActivities() {
      try {
        const res = await fetch("/api/activity?limit=6", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && Array.isArray(data.activities) && data.activities.length > 0) {
          setActivities(data.activities);
        }
      } catch {}
    }
    fetchActivities();
    const poll = window.setInterval(fetchActivities, 30000);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, []);

  // UTC midnight countdown
  useEffect(() => {
    function tick() {
      const now = new Date();
      const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      const diffSec = Math.max(0, Math.ceil((end - now.getTime()) / 1000));
      const hours = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;
      setCountdown(
        `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`
      );
    }
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotate ticker every 4 seconds
  useEffect(() => {
    if (activities.length <= 1) return;
    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [activities.length]);

  const activeItem = activities.length > 0 ? activities[currentIndex % activities.length] : undefined;

  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl border border-[#ecdcd4] bg-gradient-to-r from-[#fbf4f0] via-[#fdf9f7] to-[#fbf4f0] px-4 py-2 text-xs shadow-sm dark:border-stone-800 dark:from-[#221a17] dark:via-[#1c1816] dark:to-[#221a17]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Live indicator + current activity */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-full bg-[#fce5df] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-[#b44632] uppercase dark:bg-[#3d2720] dark:text-[#f2947a]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c94e36] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c94e36]"></span>
            </span>
            Live
          </span>

          {activeItem ? (
            <div className="min-w-0 flex-1 truncate text-stone-800 dark:text-stone-200">
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                {activeItem.product.name}
              </span>{" "}
              <span>placed verified bid for</span>{" "}
              <span className="font-bold text-[#c94e36] dark:text-[#f2947a]">
                {money(activeItem.amountCents / 100)}
              </span>{" "}
              {activeItem.currentOverallRank ? (
                <span className="text-stone-500">
                  (now #{activeItem.currentOverallRank} overall)
                </span>
              ) : null}
            </div>
          ) : (
            <div className="min-w-0 flex-1 truncate text-stone-700 dark:text-stone-300">
              <Flame size={13} className="mr-1 inline text-[#c94e36]" />
              <span>
                Today&apos;s leaderboard is actively contested! Outbid top listings to claim #1 rank.
              </span>
            </div>
          )}
        </div>

        {/* Right: Midnight UTC Reset countdown + quick action */}
        <div className="flex shrink-0 items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400">
          {countdown && (
            <span className="hidden sm:inline-flex items-center gap-1 font-mono">
              <Zap size={11} className="text-amber-500" />
              Reset in <strong className="text-stone-700 dark:text-stone-300">{countdown}</strong>
            </span>
          )}
          <Link
            href="#claim"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
              const targetInput = document.querySelector<HTMLInputElement>("input[name='target']");
              targetInput?.focus();
            }}
            className="inline-flex items-center gap-1 rounded-full bg-[#c94e36] px-3 py-1 font-medium text-white hover:bg-[#b44632] transition"
          >
            <Trophy size={11} /> Outbid Now
          </Link>
        </div>
      </div>
    </div>
  );
}
