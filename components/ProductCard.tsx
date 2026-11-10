"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { categoryToSlug } from "@/lib/utils";
import { categoryDisplay } from "./category-display";
import { ageLabel, asBoard, claimHref, money, recordedNumber, utcDate } from "./leaderboard-ui";
export interface Product {
  id:number; name:string; description:string; url:string; domain:string; category:string;
  amount_paid:number; rank_position:number; favicon_url?:string; click_count?:number;
  created_at?:string; first_paid_at?:string; listing_key?:string; [key:string]:unknown;
}
export default function ProductCard({product,nextPrice,board="all_time",onClaimBetween,allowClaim=true}: {
  product:Product; nextPrice?:number; board?:string; allowClaim?:boolean;
  onClaimBetween?:(rank:number,price:number)=>void;
}){
  const [imageError, setImageError] = useState(false);
  const [clicks, setClicks] = useState(recordedNumber(product.click_count) ?? 0);
  const [appUrl, setAppUrl] = useState("https://rankbid-marketplacelive.vercel.app");
  const timestamp = product.created_at;
  const date = utcDate(timestamp);
  const [age, setAge] = useState(date ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date) : "");

  useEffect(() => {
    setClicks(recordedNumber(product.click_count) ?? 0);
  }, [product.click_count]);

  useEffect(() => {
    if (typeof window !== "undefined") setAppUrl(window.location.origin);
  }, []);

  useEffect(() => {
    const update = () => setAge(ageLabel(timestamp));
    update();
    const interval = window.setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [timestamp]);
  const {Icon,label}=categoryDisplay(product.category);
  const detail="/product/"+encodeURIComponent(String(product.id));
  let destination=detail;
  try{const candidate=new URL(product.url);if(["https:","http:"].includes(candidate.protocol)) destination=candidate.toString();}catch{}
  const visit=()=>{if(destination===detail)return;fetch(`/api/products/${product.id}/click`,{method:"POST"}).then(async(response)=>{if(!response.ok)return;const data=await response.json();const count=recordedNumber(data.count);if(count!==null)setClicks(count);}).catch(()=>{});};
  const podium=product.rank_position>=1&&product.rank_position<=3;
  const surface=product.rank_position===1?"bg-[#fbe6df] dark:bg-[#382720]":product.rank_position===2?"bg-[#fcf0ea] dark:bg-[#2e2420]":product.rank_position===3?"bg-[#fcf6f2] dark:bg-[#26211e]":"border-b border-[#e6ded7] dark:border-stone-800";
  let claimLink="";
  if(allowClaim&&nextPrice&&Number.isSafeInteger(nextPrice)&&nextPrice>=1&&nextPrice<=999999)
    claimLink=claimHref({targetAmount:nextPrice,category:product.category,board:asBoard(board)});
  return <article id={`ranking-entry-${product.id}`} className="group relative scroll-mt-6">
    <div className={"flex items-start gap-3 px-3 py-4 sm:gap-5 sm:px-5 sm:py-[18px] "+(podium?"rounded-[25px] ":"")+surface}>
      <span className={"mt-1.5 w-8 shrink-0 text-center text-[14px] font-semibold "+(podium?"text-[#c94e36] dark:text-[#f2947a]":"text-stone-500 dark:text-stone-400")}>
        {product.rank_position === 1 ? "🥇 #1" : product.rank_position === 2 ? "🥈 #2" : product.rank_position === 3 ? "🥉 #3" : `#${product.rank_position}`}
      </span>
      <div className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center text-[#cf765f] dark:text-[#ef9b83]">
        {!imageError&&product.favicon_url?<img src={product.favicon_url} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" onError={()=>setImageError(true)}/>:<Icon size={21} strokeWidth={1.4}/>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <a href={destination} target={destination===detail?"_self":"_blank"} rel={destination===detail?undefined:"noopener noreferrer sponsored"} onClick={visit} className="min-w-0 truncate text-[14px] font-medium leading-6 text-stone-900 hover:text-[#b44632] sm:text-[15px] dark:text-stone-100 dark:hover:text-[#f2947a]">{product.name}</a>
            {podium && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">✓ DoFollow SEO</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="pt-0.5 text-[14px] font-semibold text-[#c94e36] sm:text-[15px] dark:text-[#f2947a]">{money(recordedNumber(product.amount_paid)??0)}</span>
            {claimLink && (
              <Link href={claimLink} className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[#e6ded7] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#b44632] shadow-sm hover:border-[#c94e36] hover:bg-[#fae6df]/30 transition-all dark:border-stone-700 dark:bg-[#1f1f1f] dark:text-[#f2947a]">
                ⚔️ Outbid ${nextPrice}
              </Link>
            )}
          </div>
        </div>
        {product.description&&<p className="mt-0.5 truncate text-[13px] leading-5 text-stone-500 dark:text-stone-400">{product.description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-stone-500 dark:text-stone-400">
          <Link href={`/category/${categoryToSlug(product.category)}?view=${asBoard(board)}`} className="inline-flex items-center gap-1 font-medium text-stone-700 hover:text-[#b44632] dark:text-stone-300"><Icon size={11}/>{label}</Link>
          {age&&<><span aria-hidden="true">·</span><time dateTime={date?.toISOString()}>{age}</time></>}
          {product.domain&&<><span aria-hidden="true">·</span><span className="max-w-[155px] truncate">{product.listing_key||product.domain}</span></>}
          <span aria-hidden="true">·</span><span>{clicks.toLocaleString()} clicks</span>
          <span aria-hidden="true">·</span><Link href={detail} className="hover:text-[#b44632] dark:hover:text-[#f2947a]">see details</Link>
          <span aria-hidden="true">·</span><a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out #${product.rank_position} ${product.name} on @RankBid leaderboard: `)}&url=${encodeURIComponent(`${appUrl}${detail}`)}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#b44632] dark:hover:text-[#f2947a]">share on X</a>
          <span aria-hidden="true">·</span><a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out #${product.rank_position} ${product.name} on RankBid: ${appUrl}${detail}`)}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#b44632] dark:hover:text-[#f2947a]">whatsapp</a>
        </div>
      </div>
    </div>
    {claimLink&&<div className="pointer-events-none absolute -bottom-2 left-0 right-0 z-10 flex justify-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">{onClaimBetween?<button onClick={()=>onClaimBetween(product.rank_position,nextPrice!)} className="pointer-events-auto rounded-full border border-[#e6ded7] bg-[#fdfbf8] px-3 py-0.5 text-[10px] font-medium text-[#b44632] hover:border-[#c94e36] dark:border-stone-700 dark:bg-[#171717] dark:text-[#f2947a]">Outrank for {money(nextPrice!)}</button>:<Link href={claimLink} className="pointer-events-auto rounded-full border border-[#e6ded7] bg-[#fdfbf8] px-3 py-0.5 text-[10px] font-medium text-[#b44632] hover:border-[#c94e36] dark:border-stone-700 dark:bg-[#171717] dark:text-[#f2947a]">Outrank for {money(nextPrice!)}</Link>}</div>}
  </article>;
}

