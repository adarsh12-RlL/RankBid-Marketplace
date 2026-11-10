import {notFound} from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import {getProducts} from "@/lib/ranking";
import {publicListing} from "@/lib/public-views";
export const dynamic="force-dynamic";
export default async function ArchiveDay({params}:{params:Promise<{date:string}>}){
 const {date}=await params;const day=new Date(date+"T00:00:00.000Z");if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==date||date>=new Date().toISOString().slice(0,10))notFound();
 const board=getProducts({board:"today",date,limit:10000});
 return <div className="rankbid-page"><Header/><main className="rankbid-page-main max-w-3xl"><Link href="/daily" className="inline-flex rounded-full border border-[#d6e2ee] bg-white/70 px-3 py-2 text-xs text-[#536b83] hover:border-[#94b8d9] dark:border-[#34485d] dark:bg-[#142233] dark:text-[#b7c8d9]">‹ All daily rankings</Link><section className="rankbid-page-heading mt-5"><span className="rankbid-page-kicker">Frozen UTC archive</span><h1>Daily ranking · {date}</h1><p>{board.archive?`First saved ${board.archive.capturedAt}. `:""}Later payments and refunds do not change this board.</p></section><div className="space-y-3">{board.products.map(p=><ProductCard key={p.id} product={publicListing(p)} board="today" allowClaim={false}/>)}{!board.products.length&&<p className="rankbid-page-empty text-sm">No visible verified placements for this date.</p>}</div></main><Footer/></div>;
}
