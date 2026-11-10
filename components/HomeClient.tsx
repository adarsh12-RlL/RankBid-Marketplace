"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "./Header";
import CategoryTabs from "./CategoryTabs";
import TimeToggle from "./TimeToggle";
import HeroSection from "./HeroSection";
import ProductCard,{type Product} from "./ProductCard";
import Sidebar from "./Sidebar";
import Pagination from "./Pagination";
import LatestActivity from "./LatestActivity";
import BottomStats from "./BottomStats";
import Footer from "./Footer";
import PublicReviews from "./PublicReviews";
import LiveTicker from "./LiveTicker";
import { asBoard,claimHref,feedHref,money,recordedNumber,type PublicStats } from "./leaderboard-ui";

export default function HomeClient({products=[],todayProducts,allTimeProducts,topPrice=0,board="all_time",category="All",search="",stats=null,minBid=1,topBonus=5,total=products.length,page=1,pageSize=50}:{products?:Product[];total?:number;page?:number;pageSize?:number;todayProducts?:Product[];allTimeProducts?:Product[];topPrice?:number;board?:string;category?:string;search?:string;stats?:PublicStats|null;minBid?:number;topBonus?:number;}){
  const router=useRouter(); const recorded=stats;
  useEffect(()=>{
    let lastRefresh=Date.now();
    const refresh=()=>{const now=Date.now();if(document.visibilityState==="visible"&&now-lastRefresh>=10000){lastRefresh=now;router.refresh();}};
    const timer=window.setInterval(refresh,30000);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);
    return()=>{clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};
  },[router]);
  const currentBoard=asBoard(board), otherBoard=currentBoard==="all_time"?"today":"all_time";
  const counterProducts=otherBoard==="today"?todayProducts:allTimeProducts;
  const isTest=recorded?.isTest===true;
  const visitors=recordedNumber(recorded?.totalVisitors)??recordedNumber(recorded?.visitors);
  const revenue=recordedNumber(recorded?.totalRevenue)??recordedNumber(recorded?.revenue);
  const productCount=recordedNumber(recorded?.totalProducts)??recordedNumber(recorded?.products);
  const emptyHref=claimHref({targetAmount:Math.max(1,Math.ceil(minBid)),category,board:currentBoard});
  const champion=products.find(p=>p.rank_position===1);

  return (
    <div className="rankbid-home min-h-screen bg-[#fdfbf8] font-sans text-stone-900 selection:bg-[#f4c5b7] dark:bg-[#171717] dark:text-stone-100">
      <Header stats={recorded}/>
      <main className="mx-auto max-w-[1024px] px-4 pb-12">
        <LiveTicker/>
        <CategoryTabs activeCategory={category} board={currentBoard}/>
        <TimeToggle board={currentBoard} category={category} search={search}/>
        <HeroSection topPrice={topPrice} category={category} board={currentBoard} minBid={minBid} topBonus={topBonus}/>
        {isTest&&<p className="mb-5 text-center text-[11px] text-stone-500">Test board · placements here use test payments. No real money is charged.</p>}
        {search&&<div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-[#e6ded7] pb-3 text-xs text-stone-500 dark:border-stone-700"><p>Showing {total} matching placement{total===1?"":"s"} for “{search}”</p><Link href={feedHref(currentBoard,category)} className="text-[#b44632] hover:underline dark:text-[#f2947a]">Clear search</Link></div>}
        
        {champion && currentBoard === "all_time" && page === 1 && !search && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 p-4 shadow-sm dark:border-amber-900/50 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-amber-950/40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl shadow-md text-white">
                  👑
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Current Leaderboard Champion</span>
                    <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-300">#1 RANK</span>
                    <span className="hidden sm:inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">✓ DoFollow SEO Active</span>
                  </div>
                  <h3 className="text-[15px] font-bold text-stone-900 dark:text-white mt-0.5">
                    {champion.name} <span className="text-xs font-normal text-stone-500">({champion.domain})</span>
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-stone-500">Winning Bid</div>
                  <div className="text-sm font-bold text-[#c94e36] dark:text-[#f2947a]">{money(recordedNumber(champion.amount_paid) ?? 0)}</div>
                </div>
                {topPrice > 0 && (
                  <Link href={claimHref({ targetAmount: Math.ceil(topPrice + topBonus), category: champion.category, board: currentBoard })} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#c94e36] to-[#b44632] px-4 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all hover:scale-[1.02]">
                    ⚔️ Dethrone #1 for ${Math.ceil(topPrice + topBonus)}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,1fr)_230px] md:gap-6">
          <section aria-label="Ranked products" className="min-w-0 space-y-3">
            {products.length?products.map((p)=>{const target=Math.max(1,Math.ceil(p.amount_paid+(p.rank_position===1?topBonus:1)));return <ProductCard key={p.id} product={p} board={currentBoard} nextPrice={target<=999999?target:undefined}/>;}):<div className="rounded-[25px] bg-[#fcf0ea] px-6 py-12 text-center dark:bg-[#29211d]"><h2 className="text-base font-medium">{search?"No matching placements":currentBoard==="today"?"No ranks claimed since midnight UTC":"The board is ready for its first product"}</h2><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-stone-500">{search?"Try a different name, website or category.":"Submit your product and choose a paid placement. Your position follows confirmed spend."}</p><Link href={search?feedHref(currentBoard,category):emptyHref} className="mt-5 inline-flex rounded-full bg-[#c94e36] px-5 py-2.5 text-xs font-semibold text-white">{search?"Clear search":"Submit a product"}</Link></div>}
            {products.length>0&&<div className="pt-6"><p className="mb-4 text-center text-[11px] text-stone-500">Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize,total)} of {total} placements</p><Pagination page={page} total={total} pageSize={pageSize} board={currentBoard} category={category} search={search}/></div>}
          </section>
          <div>
            <Sidebar products={counterProducts} board={otherBoard} category={category}/>
            <LatestActivity/>
          </div>
        </div>
        <BottomStats visitors={visitors} revenue={revenue} products={productCount} isTest={isTest}/>
        <PublicReviews/>
      </main>
      <Footer/>
    </div>
  );
}
