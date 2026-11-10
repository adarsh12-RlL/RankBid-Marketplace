import HomeClient from "@/components/HomeClient";
import {getProducts,stats,setting} from "@/lib/ranking";
import {getPublicFeed,publicListing} from "@/lib/public-views";
export const dynamic="force-dynamic";export const revalidate=0;
export default async function Home({searchParams}:{searchParams:Promise<{category?:string;search?:string;view?:string;page?:string}>}){
 const q=await searchParams;const board=q.view==="today"?"today":"all_time",category=q.category||"All",search=q.search?.slice(0,200)||"";
 const feed=getPublicFeed({board,category,search,page:q.page});
 return <HomeClient products={feed.products} total={feed.total} page={feed.page} pageSize={feed.pageSize} todayProducts={getProducts({board:"today",category,limit:6}).products.map(publicListing)} allTimeProducts={getProducts({board:"all_time",category,limit:6}).products.map(publicListing)} topPrice={feed.topPrice} board={board} category={category} search={search} stats={stats()} minBid={Math.max(1,setting("min_bid",1))} topBonus={setting("top_bonus",5)}/>;
}
