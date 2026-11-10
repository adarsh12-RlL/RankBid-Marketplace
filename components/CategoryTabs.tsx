"use client";
import Link from "next/link";
import { CATEGORIES, categoryToSlug } from "@/lib/utils";
import { categoryDisplay } from "./category-display";
import { feedHref } from "./leaderboard-ui";
const priorities = [/^leaderboard/i, /^marketing/i, /^seo/i, /^productivity/i, /^agent|^ai agent/i, /^developer/i, /^crypto/i, /^game/i];
export default function CategoryTabs({ activeCategory = "All", board = "all_time" }: { activeCategory?: string; board?: string; }) {
  const primary = ["All", ...priorities.map((pattern) => CATEGORIES.find((name) => pattern.test(name))).filter((name): name is string => !!name)];
  if (activeCategory && activeCategory.toLowerCase() !== "all" && !primary.some((name) => categoryToSlug(name) === categoryToSlug(activeCategory))) primary.push(activeCategory);
  return <nav aria-label="Product categories" className="flex items-center gap-1 rounded-full bg-[#f4f1ed] p-1.5 dark:bg-[#232220]">
    <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto no-scrollbar">
      {[...new Set(primary)].map((name) => { const { label, Icon } = categoryDisplay(name); const active = categoryToSlug(name) === categoryToSlug(activeCategory || "All"); return <Link key={name} href={feedHref(board, name)} aria-current={active ? "page" : undefined} className={"inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors " + (active ? "bg-[#c94e36] text-white" : "text-stone-700 hover:bg-white dark:text-stone-200 dark:hover:bg-stone-700")}><Icon size={13} strokeWidth={1.6} className={active ? "" : "text-[#cf765f] dark:text-[#ef9b83]"}/><span>{label}</span></Link>; })}
    </div>
    <Link href="/categories" className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-[#b44632] hover:bg-white dark:text-[#f2947a] dark:hover:bg-stone-700"><span aria-hidden="true">+</span>Explore</Link>
  </nav>;
}
