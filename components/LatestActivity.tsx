"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {ageLabel,money,utcDate} from "./leaderboard-ui";
interface Activity {id:number;product:{id:number;name:string;category:string};amountCents:number;confirmedAt:string;currentOverallRank:number|null;currentCategoryRank:number|null;rankScope:"current_all_time";}
export default function LatestActivity(){
 const [items,setItems]=useState<Activity[]|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let alive=true;const controller=new AbortController();async function load(){try{const response=await fetch("/api/activity?limit=6",{cache:"no-store",signal:controller.signal});if(!response.ok)throw Error();const data=await response.json();if(!Array.isArray(data.activities))throw Error();if(alive){setItems(data.activities);setFailed(false);}}catch{if(alive)setFailed(true);}}
 void load();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},30000);return()=>{alive=false;controller.abort();clearInterval(timer);};},[]);
 return <section aria-label="Latest verified activity" className="mt-8 border-t border-[#e6ded7] pt-5 dark:border-stone-700"><h2 className="text-[13px] font-medium">Latest activity</h2><p className="mt-1 text-[10px] leading-4 text-stone-500">Verified placements · ranks shown are current.</p>
 {items===null?<p role="status" className="mt-3 text-xs text-stone-500">{failed?"Activity could not load.":"Loading verified placements…"}</p>:items.length?<ol className="mt-4 space-y-4">{items.map(item=><li key={item.id} className="text-[11px] leading-4"><Link href={`/product/${item.product.id}`} className="font-medium text-stone-800 hover:text-[#b44632] dark:text-stone-200">{item.product.name}</Link><p className="mt-0.5 text-stone-500"><span className="font-medium text-[#c94e36] dark:text-[#f2947a]">{money(item.amountCents/100)}</span> verified net spend{item.currentOverallRank!==null?` · currently #${item.currentOverallRank} overall`:""}</p><time dateTime={utcDate(item.confirmedAt)?.toISOString()} className="mt-0.5 block text-[10px] text-stone-400">{ageLabel(item.confirmedAt)}</time></li>)}</ol>:<p className="mt-3 text-xs leading-5 text-stone-500">No verified placement activity yet.</p>}
 {failed&&items!==null&&<p className="mt-3 text-[10px] text-stone-500">Updates are temporarily unavailable.</p>}
 </section>;
}

