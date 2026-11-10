"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { asBoard, feedHref } from "./leaderboard-ui";
export default function TimeToggle({ board = "all_time", category = "All", search = "" }: { board?: string; category?: string; search?: string; }) {
  const router = useRouter(); const [remaining, setRemaining] = useState<string | null>(null); const previousDay = useRef("");
  useEffect(() => {
    function tick() {
      const now = new Date(), day = now.toISOString().slice(0,10);
      if (previousDay.current && previousDay.current !== day) router.refresh();
      previousDay.current = day;
      const end = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1);
      const seconds = Math.max(0,Math.ceil((end-now.getTime())/1000));
      setRemaining([Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map((n)=>String(n).padStart(2,"0")).join(":"));
    }
    tick(); const timer = window.setInterval(tick,1000); return ()=>clearInterval(timer);
  },[router]);
  const selected = asBoard(board);
  return <div className="mt-7 mb-3 text-center"><div role="navigation" aria-label="Ranking period" className="inline-flex items-center rounded-full border border-[#e6ded7] p-0.5 text-[13px] dark:border-stone-700">
    <Link href={feedHref("all_time",category,search)} aria-current={selected === "all_time" ? "page" : undefined} className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium " + (selected === "all_time" ? "bg-[#c94e36] text-white" : "text-[#b44632] hover:bg-[#f9eae4] dark:text-[#f2947a] dark:hover:bg-stone-800")}><Trophy size={13}/>All-time</Link>
    <Link href={feedHref("today",category,search)} aria-current={selected === "today" ? "page" : undefined} className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium " + (selected === "today" ? "bg-[#c94e36] text-white" : "text-[#b44632] hover:bg-[#f9eae4] dark:text-[#f2947a] dark:hover:bg-stone-800")}><span className="h-1.5 w-1.5 rounded-full bg-current"/>Today</Link>
  </div>{selected === "today" && <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">Resets at midnight UTC{remaining ? " · " + remaining + " left" : ""}</p>}</div>;
}
