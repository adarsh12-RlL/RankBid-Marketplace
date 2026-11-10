"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Search, Moon, Sun, Menu, X, LogOut, ArrowUpRight } from "lucide-react";
import { recordedNumber, type PublicStats } from "./leaderboard-ui";
import RankBidMark from "./RankBidMark";
import RankLensHomeLink from "./RankLensHomeLink";
interface User { id: string; email: string; role: string; }
const nav = [["Daily", "/daily"], ["Categories", "/categories"], ["Games", "/games"], ["About", "/about"], ["Companies", "/companies"], ["Rules", "/rules"], ["Feedback", "/feedback"]];
export default function Header({stats}:{stats?:PublicStats|null}={}) {
  const router = useRouter(), pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false), [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false), [search, setSearch] = useState("");
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const suppliedStats=stats!==undefined;
  const [counts, setCounts] = useState<PublicStats | null>(stats??null), [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const authVersion = useRef(0);
  useEffect(()=>{if(suppliedStats)setCounts(stats??null);},[stats,suppliedStats]);
  useEffect(() => {
    setMounted(true);
    let alive = true;
    const controller = new AbortController();
    async function account() {
      const version = ++authVersion.current;
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        const data = response.ok ? await response.json() : { user: null };
        const candidate = data.user;
        if (alive && version === authVersion.current)
          setUser(candidate && typeof candidate.id === "string" && typeof candidate.email === "string"
            ? { id: candidate.id, email: candidate.email, role: candidate.role } : null);
      } catch { if (alive && version === authVersion.current) setUser(null); }
    }
    async function statistics() {
      try {
        const response = await fetch("/api/stats", { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json(); if (alive) setCounts(data);
      } catch { if (alive) setCounts(null); }
    }
    const onFocus = () => { void account(); void statistics(); };
    void account(); void statistics();
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void statistics(); }, 30000);
    window.addEventListener("focus", onFocus);
    window.addEventListener("rankbid-auth-changed", onFocus);
    return () => { alive = false; controller.abort(); clearInterval(interval); window.removeEventListener("focus", onFocus); window.removeEventListener("rankbid-auth-changed", onFocus); };
  }, []);
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);
  useEffect(() => {
    if (!searchOpen && !menuOpen) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setSearchOpen(false); setMenuOpen(false); } };
    window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape);
  }, [searchOpen, menuOpen]);
  async function logout() {
    setSigningOut(true); setError(""); ++authVersion.current;
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("Sign out failed. Please try again.");
      setUser(null); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Sign out failed."); }
    finally { setSigningOut(false); }
  }
  function searchProducts(event: React.FormEvent) {
    event.preventDefault();
    const current = new URL(window.location.href);
    const params = new URLSearchParams(current.search);
    params.delete("page");
    if (search.trim()) params.set("search", search.trim()); else params.delete("search");
    const path = current.pathname.startsWith("/category/") ? current.pathname : "/";
    router.push(path + (params.toString() ? "?" + params.toString() : ""));
    setSearchOpen(false);
  }
  const online = recordedNumber(counts?.online), todayVisitors = recordedNumber(counts?.todayVisitors);
  const members = recordedNumber(counts?.members), onlineMembers = recordedNumber(counts?.onlineMembers);
  const activityCounts = [
    { label: "Total members", value: members, online: false },
    { label: "Members online", value: onlineMembers, online: true },
    { label: "Visitors online", value: online, online: true },
    { label: "Visitors today", value: todayVisitors, online: false },
  ];
  const iconButton = "inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c94e36]";
  return <header className="rankbid-header bg-[#fdfbf8] text-stone-900 dark:bg-[#171717] dark:text-stone-100">
    <div className="mx-auto max-w-[1024px] px-4 pt-5 pb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="RankBid home" className="inline-flex shrink-0 items-center gap-2 text-[23px] font-semibold tracking-tight">
            <RankBidMark size={28} />
            <span>Rank<span className="text-[#c94e36] dark:text-[#f2947a]">Bid</span></span>
          </Link>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <nav aria-label="Main navigation" className="mr-1 hidden items-center gap-5 text-[13px] text-stone-600 md:flex dark:text-stone-300">
            {nav.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className="hover:text-[#b44632] dark:hover:text-[#f2947a]">{label}</Link>)}
          </nav>
          <button className={iconButton} aria-label={searchOpen ? "Close search" : "Search products"} aria-expanded={searchOpen} aria-controls="rankbid-search" onClick={() => setSearchOpen(!searchOpen)}><Search size={16} /></button>
          <button className={iconButton} aria-label="Switch colour theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} disabled={!mounted}>{mounted && resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
          {user ? <details className="relative">
            <summary aria-label="Account menu" className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full bg-[#f6dfd7] text-xs font-semibold text-[#923d2c] dark:bg-stone-800 dark:text-[#f2947a]">{user.email[0]?.toUpperCase() || "U"}</summary>
            <div className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-[#e6ded7] bg-[#fdfbf8] p-2 shadow-lg dark:border-stone-700 dark:bg-[#222]">
              <p className="truncate border-b border-stone-200 px-3 py-2 text-xs text-stone-500 dark:border-stone-700">{user.email}</p>
              <Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100 dark:hover:bg-stone-800">My products & payments</Link>
              {user.role === "admin" && <Link href="/admin/dashboard" className="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100 dark:hover:bg-stone-800">Admin dashboard</Link>}
              <Link href="/messages" className="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100 dark:hover:bg-stone-800">{user.role === "admin" ? "Admin messages" : "Messages"}</Link>
              <button disabled={signingOut} onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-100 disabled:opacity-50 dark:hover:bg-stone-800"><LogOut size={14} />{signingOut ? "Signing out…" : "Sign out"}</button>
            </div>
          </details> : user === null ? <Link href="/login" className="hidden rounded-full border border-[#e6ded7] px-3 py-1.5 text-xs hover:bg-stone-100 sm:inline-flex dark:border-stone-700 dark:hover:bg-stone-800">Sign in</Link> : null}
          <button className={iconButton + " md:hidden"} aria-expanded={menuOpen} aria-controls="rankbid-mobile-nav" aria-label="Open navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      <nav className="rankbid-home-shortcuts" aria-label="Website home pages">
        <Link href="/" className="rankbid-home-link" aria-current={pathname === "/" ? "page" : undefined}>RankBid Home</Link>
        <RankLensHomeLink />
      </nav>
      <div className="rankbid-header-stats mt-4 flex items-end gap-3 rounded-2xl border border-[#e6ded7] bg-white/40 px-3 py-2.5 dark:border-stone-800 dark:bg-white/[.02]" aria-label="Community and visitor statistics">
        <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
          {activityCounts.map(item => <div key={item.label} title={item.online ? "Active in the last 5 minutes" : undefined}>
            <dt className="text-[10px] leading-4 text-stone-500 dark:text-stone-400">{item.label}</dt>
            <dd className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-200">
              {item.online && <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + (item.value !== null && item.value > 0 ? "bg-emerald-500" : "bg-stone-400 dark:bg-stone-600")} />}
              {item.value === null ? <span aria-label="Not available">—</span> : item.value.toLocaleString()}
            </dd>
          </div>)}
        </dl>
        <Link href="/stats" className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-[#b44632] hover:bg-[#f8eee8] dark:text-[#f2947a] dark:hover:bg-stone-800" aria-label="Open recorded public statistics">Stats <ArrowUpRight size={12}/></Link>
      </div>
      {searchOpen && <form id="rankbid-search" onSubmit={searchProducts} className="mt-4 flex gap-2"><label htmlFor="rankbid-search-input" className="sr-only">Search products</label><input id="rankbid-search-input" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} maxLength={200} placeholder="Search names, websites or descriptions…" className="min-w-0 flex-1 rounded-full border border-[#e6ded7] bg-transparent px-4 py-2 text-sm outline-none focus:border-[#c94e36] dark:border-stone-700"/><button className="rounded-full bg-[#c94e36] px-5 py-2 text-sm font-medium text-white">Search</button></form>}
      {menuOpen && <nav id="rankbid-mobile-nav" aria-label="RankBid mobile navigation" className="mt-4 grid grid-cols-2 gap-1 border-t border-[#e6ded7] pt-3 text-sm md:hidden dark:border-stone-700">{nav.map(([label, href]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800">{label}</Link>)}<Link href="/stats" className="flex items-center gap-1 px-3 py-2">Public statistics <ArrowUpRight size={12}/></Link><Link href="/datafast" className="flex items-center gap-1 px-3 py-2">RankLens Home <ArrowUpRight size={12}/></Link>{!user && <Link href="/login" className="px-3 py-2">Sign in</Link>}</nav>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  </header>;
}

