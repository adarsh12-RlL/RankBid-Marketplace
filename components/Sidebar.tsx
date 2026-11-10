"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import type { Product } from "./ProductCard";
import { categoryDisplay } from "./category-display";
import { asBoard,feedHref,money,recordedNumber } from "./leaderboard-ui";
export default function Sidebar({todayProducts,products,board="today",category="All"}:{todayProducts?:Product[];products?:Product[];board?:string;category?:string;}){
  const initial=products??todayProducts;
  const [items,setItems]=useState<Product[]>(initial??[]),[failed,setFailed]=useState(false),[loading,setLoading]=useState(initial===undefined);
  useEffect(()=>{
    if(initial!==undefined){setItems(initial);setFailed(false);setLoading(false);return;}
    setLoading(true);
    let alive=true;const controller=new AbortController();
    async function load(){try{const params=new URLSearchParams({board:asBoard(board),category,limit:"6"});const response=await fetch("/api/products?"+params,{cache:"no-store",signal:controller.signal});if(!response.ok)throw new Error();const data=await response.json();if(!Array.isArray(data.products))throw new Error();if(alive){setItems(data.products);setFailed(false);}}catch{if(alive)setFailed(true);}finally{if(alive)setLoading(false);}}
    void load();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},30000);
    return()=>{alive=false;controller.abort();clearInterval(timer);};
  },[initial,board,category]);
  function destination(p:Product){try{const u=new URL(p.url);if(["http:","https:"].includes(u.protocol))return u.toString();}catch{}return "/product/"+encodeURIComponent(String(p.id));}
  return <aside aria-label={asBoard(board)==="today"?"Today's leaderboard preview":"All-time leaderboard preview"} className="min-w-0 pt-1">
    <div className="mb-3 flex items-center justify-between gap-2"><h2 className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-900 dark:text-stone-100"><span className="h-1.5 w-1.5 rounded-full bg-[#df6b51]"/>{asBoard(board)==="today"?"Today's ranking":"All-time ranking"}</h2><Link href={feedHref(board,category)} className="text-[11px] text-[#b44632] hover:underline dark:text-[#f2947a]">See all ›</Link></div>
    {failed?<p className="text-xs leading-5 text-stone-500">The preview could not load. <Link className="underline" href={feedHref(board,category)}>Open the board</Link>.</p>:loading?<p className="text-xs text-stone-500" role="status">Loading the board…</p>:items.length?<ol className="space-y-2.5">{items.slice(0,6).map((p)=>{const {Icon}=categoryDisplay(p.category);return <li key={p.id}><a href={destination(p)} target={/^https?:/.test(destination(p))?"_blank":"_self"} rel={/^https?:/.test(destination(p))?"noopener noreferrer sponsored":undefined} onClick={()=>{if(/^https?:/.test(destination(p)))void fetch(`/api/products/${p.id}/click`,{method:"POST"}).catch(()=>{});}} className="flex min-w-0 items-center gap-2 text-[11px] text-stone-800 hover:text-[#b44632] dark:text-stone-200"><span className="w-5 shrink-0 text-[10px] text-stone-500">#{p.rank_position}</span><Icon size={12} strokeWidth={1.4} className="shrink-0 text-[#cf765f]"/><span className="min-w-0 flex-1 truncate">{p.name}</span><span className="shrink-0 font-medium text-[#c94e36] dark:text-[#f2947a]">{money(recordedNumber(p.amount_paid)??0)}</span></a></li>;})}</ol>:<p className="text-xs leading-5 text-stone-500">{asBoard(board)==="today"?"Nobody has claimed a rank since midnight UTC.":"No verified placements on this board yet."}</p>}
  </aside>;
}
