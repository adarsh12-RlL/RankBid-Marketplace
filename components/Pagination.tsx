import Link from "next/link";
import {feedHref} from "./leaderboard-ui";
export default function Pagination({page,total,pageSize=50,board="all_time",category="All",search=""}:{page:number;total:number;pageSize?:number;board?:string;category?:string;search?:string}){
 const pages=Math.max(1,Math.ceil(total/pageSize));if(pages<=1)return null;
 const candidates=Array.from(new Set([1,page-1,page,page+1,pages])).filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b);
 const style="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs border border-[#e6ded7] hover:border-[#c94e36] dark:border-stone-700";
 return <nav aria-label="Leaderboard pages" className="flex flex-wrap items-center justify-center gap-2 border-t border-[#e6ded7] pt-6 dark:border-stone-700">
 {page>1&&<Link rel="prev" href={feedHref(board,category,search,page-1)} className={style+" mr-1"}>‹ Previous</Link>}
 {candidates.map((n,index)=><span key={n} className="inline-flex items-center gap-2">{index>0&&n>candidates[index-1]+1&&<span aria-hidden="true" className="text-stone-400">…</span>}<Link aria-current={page===n?"page":undefined} aria-label={`Page ${n}`} href={feedHref(board,category,search,n)} className={style+(page===n?" border-[#c94e36] bg-[#c94e36] text-white":" text-stone-600 dark:text-stone-300")}>{n}</Link></span>)}
 {page<pages&&<Link rel="next" href={feedHref(board,category,search,page+1)} className={style+" ml-1"}>Next ›</Link>}
 </nav>;
}
