"use client";
import Link from "next/link";
import { money,recordedNumber } from "./leaderboard-ui";
export default function BottomStats({visitors=null,revenue=null,products=null,days,isTest=false}:{visitors?:number|null;revenue?:number|null;products?:number|null;days?:number;isTest?:boolean;}){
  const values=[{label:"recorded visitors",value:recordedNumber(visitors),format:(n:number)=>n.toLocaleString()},{label:isTest?"test placement total":"recorded placement revenue",value:recordedNumber(revenue),format:money},{label:"ranked products",value:recordedNumber(products),format:(n:number)=>n.toLocaleString()}];
  return <section className="mx-auto mt-16 max-w-2xl border-t border-[#e6ded7] pt-8 text-center dark:border-stone-800" aria-label="Recorded project statistics"><p className="text-xs text-stone-500">Recorded activity{recordedNumber(days)!==null?" · "+days+" days since launch":""} · <Link href="/stats" className="text-[#b44632] hover:underline dark:text-[#f2947a]">View public statistics ↗</Link></p><dl className="mt-5 grid grid-cols-3 gap-3">{values.map(({label,value,format})=><div key={label}><dd className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl dark:text-stone-100">{value===null?<span aria-label="Not measured">—</span>:format(value)}</dd><dt className="mt-1 text-[10px] leading-4 text-stone-500 sm:text-xs">{label}</dt></div>)}</dl></section>;
}
