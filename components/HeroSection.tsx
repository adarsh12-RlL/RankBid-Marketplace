"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Minus, Plus, ArrowRight } from "lucide-react";
import { CATEGORIES } from "@/lib/utils";
import { asBoard, claimHref, recordedNumber, type ClaimPrefill } from "./leaderboard-ui";
export default function HeroSection({ topPrice = 0, category = "All", board = "all_time", minBid = 1, topBonus = 5, onOpenClaimModal }: {
  topPrice?: number; category?: string; board?: string; minBid?: number; topBonus?: number;
  onOpenClaimModal?: (prefill: ClaimPrefill & { url: string; category: string }) => void;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState({ minimum: Math.max(1,minBid), bonus: Math.max(1,topBonus) });
  const minimum = Math.ceil(settings.minimum);
  const leaderAmount = recordedNumber(topPrice) ?? 0;
  const suggested = Math.min(999999,Math.max(minimum,leaderAmount > 0 ? Math.ceil(leaderAmount + settings.bonus) : minimum));
  const [amount, setAmount] = useState(String(suggested)), [url, setUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES.includes(category) && category !== "All" ? category : "");
  const [error, setError] = useState("");
  const dirtyAmount = useRef(false), context = asBoard(board) + ":" + category, previousContext = useRef(context);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/payment/info",{cache:"no-store",signal:controller.signal}).then((r)=>{if(!r.ok) throw new Error(); return r.json();}).then((data)=>{
      const min = recordedNumber(data.minBid), bonus = recordedNumber(data.topBonus);
      setSettings({minimum:Math.max(1,min ?? minBid),bonus:Math.max(1,bonus ?? topBonus)});
    }).catch(()=>{});
    return ()=>controller.abort();
  },[minBid,topBonus]);
  useEffect(()=>{
    if(previousContext.current !== context){
      previousContext.current=context; dirtyAmount.current=false; setUrl(""); setError("");
      setSelectedCategory(CATEGORIES.includes(category) && category !== "All" ? category : "");
    }
    if(!dirtyAmount.current) setAmount(String(suggested));
  },[context,suggested,category]);
  const value = Number(amount);
  const topTarget = Math.max(minimum,leaderAmount > 0 ? Math.ceil(leaderAmount + settings.bonus) : minimum);
  const claimsTop = Number.isSafeInteger(value) && value >= topTarget;
  function step(direction:number){dirtyAmount.current=true;setAmount(String(Math.min(999999,Math.max(minimum,(Number.isSafeInteger(value)?value:minimum)+direction))));setError("");}
  function claim(event:React.FormEvent){
    event.preventDefault(); setError("");
    try{
      if(!Number.isSafeInteger(value)||value<minimum||value>999999) throw new Error(`Choose a whole-dollar target from $${minimum} to $999,999.`);
      if(!url.trim()) throw new Error("Enter your product website or X handle.");
      if(!selectedCategory || !CATEGORIES.includes(selectedCategory)) throw new Error("Choose a product category.");
      const prefill={url:url.trim(),category:selectedCategory,targetAmount:value,board:asBoard(board)};
      const destination=claimHref(prefill);
      if(onOpenClaimModal) onOpenClaimModal(prefill); else router.push(destination);
    }catch(failure){setError(failure instanceof Error?failure.message:"Please check your submission.");}
  }
  return <section className="rankbid-hero mx-auto mt-6 mb-8 text-center" aria-label="Claim a paid placement"><form onSubmit={claim}>
    <div className="mb-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:gap-x-3">
      <h1 className="text-[29px] font-semibold tracking-[-0.04em] leading-tight text-stone-950 sm:text-[40px] dark:text-stone-100">Claim {claimsTop?"#1":"a rank"}{category && category.toLowerCase()!=="all"?<span> in {category}</span>:null} for</h1>
      <div className="inline-flex items-center gap-2">
        <button type="button" onClick={()=>step(-1)} disabled={value<=minimum} aria-label="Decrease target by one dollar" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fae6df] text-[#b44632] disabled:opacity-35 dark:bg-[#3b2923] dark:text-[#f2947a]"><Minus size={13}/></button>
        <label className="inline-flex items-center text-[31px] font-semibold leading-none tracking-[-0.04em] text-[#cf5a40] sm:text-[40px] dark:text-[#f2947a]"><span aria-hidden="true">$</span><span className="sr-only">Target total in US dollars</span><input name="target" aria-label="Target total in US dollars" type="number" inputMode="numeric" min={minimum} max={999999} step={1} required value={amount} onChange={(e)=>{dirtyAmount.current=true;setAmount(e.target.value);setError("");}} style={{width:Math.max(2,Math.min(7,amount.length+0.3))+"ch"}} className="m-0 appearance-none border-0 border-b border-transparent bg-transparent p-0 text-left tabular-nums outline-none focus:border-[#c94e36]"/></label>
        <button type="button" onClick={()=>step(1)} disabled={value>=999999} aria-label="Increase target by one dollar" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fae6df] text-[#b44632] disabled:opacity-35 dark:bg-[#3b2923] dark:text-[#f2947a]"><Plus size={13}/></button>
      </div>
    </div>
    <div className="mx-auto flex max-w-[900px] flex-col items-stretch gap-3 text-left sm:flex-row">
      <label className="relative flex min-w-0 flex-1 items-center"><Globe size={15} className="pointer-events-none absolute left-4 text-stone-500"/><span className="sr-only">Your product URL or X handle</span><input type="text" required maxLength={2048} value={url} onChange={(e)=>{setUrl(e.target.value);setError("");}} placeholder="Your product URL or @handle" className="w-full rounded-full border border-[#e6ded7] bg-white/70 py-3 pl-10 pr-4 text-sm text-stone-900 outline-none placeholder:text-stone-500 focus:border-[#c94e36] dark:border-stone-700 dark:bg-[#222] dark:text-stone-100"/></label>
      <label className="sm:w-60"><span className="sr-only">Choose a category</span><select required value={selectedCategory} onChange={(e)=>{setSelectedCategory(e.target.value);setError("");}} className="h-full w-full rounded-full border border-[#e6ded7] bg-white/70 px-4 py-3 text-[13px] text-stone-700 outline-none focus:border-[#c94e36] dark:border-stone-700 dark:bg-[#222] dark:text-stone-200"><option value="">Choose a category</option>{CATEGORIES.filter((name)=>name!=="All"&&name!=="Explore").map((name)=><option key={name} value={name}>{name}</option>)}</select></label>
      <button type="submit" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#c94e36] px-6 py-3 text-sm font-semibold text-white hover:bg-[#af402b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c94e36]">Claim rank<ArrowRight size={14}/></button>
    </div>
    {error&&<p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
    {!claimsTop&&topTarget<=999999&&<p className="mt-3 text-[11px] text-stone-500">Current #1 target starts at ${topTarget.toLocaleString("en-US")}. You can choose a lower placement.</p>}
  </form></section>;
}
