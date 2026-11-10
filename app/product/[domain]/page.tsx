import {notFound} from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductActions from "@/components/ProductActions";
import {ageLabel,claimHref,feedHref,money,utcDate} from "@/components/leaderboard-ui";
import {getPublicProduct,BOARD_PAGE_SIZE} from "@/lib/public-views";
import {setting} from "@/lib/ranking";
export const dynamic="force-dynamic";

export default async function Product({params}:{params:Promise<{domain:string}>}){
  const {domain}=await params;
  const detail=getPublicProduct(domain);
  if(!detail)notFound();
  const {product:p}=detail;
  const categoryHref=feedHref("all_time",p.category,"",Math.floor((detail.categoryRank-1)/BOARD_PAGE_SIZE)+1)+`#ranking-entry-${p.id}`;
  const overallHref=feedHref("all_time","All","",Math.floor((detail.overallRank-1)/BOARD_PAGE_SIZE)+1)+`#ranking-entry-${p.id}`;
  const target=Math.max(1,Math.ceil(p.amount_paid+(detail.categoryRank===1?setting("top_bonus",5):setting("min_increment",1))));

  return (
    <div className="min-h-screen bg-[#fdfbf8] text-stone-900 dark:bg-[#171717] dark:text-stone-100">
      <Header/>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-9">
        <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <Link href="/" className="hover:text-[#b44632]">Leaderboard</Link>
          <span aria-hidden="true">›</span>
          <Link href={feedHref("all_time",p.category)} className="hover:text-[#b44632]">{p.category}</Link>
        </nav>

        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{p.name}</h1>
        <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1 text-xs text-stone-500">
          <Link href={feedHref("all_time",p.category)} className="font-medium text-stone-700 dark:text-stone-300">{p.category}</Link>
          <span>·</span>
          <span>{p.listing_key||p.domain}</span>
          {p.created_at&&<><span>·</span><time dateTime={utcDate(p.created_at)?.toISOString()}>{ageLabel(p.created_at)}</time></>}
          <span>·</span>
          <span>{p.click_count.toLocaleString()} clicks</span>
        </div>

        {detail.isTest&&<p className="mt-3 text-[11px] text-stone-500">Test payment board · no real money.</p>}
        <p className="mt-6 text-sm leading-7 text-stone-600 dark:text-stone-400">{p.description}</p>
        
        <ProductActions id={p.id} url={p.url} name={p.name} rank={detail.overallRank} category={p.category}/>

        <section aria-label="Current ranking" className="my-10 grid gap-4 sm:grid-cols-2">
          {[{label:"Category rank",rank:detail.categoryRank,count:detail.categoryCount,scope:`in ${p.category}`,href:categoryHref,link:"See category ranking"},{label:"Overall",rank:detail.overallRank,count:detail.overallCount,scope:"on the board",href:overallHref,link:"See overall ranking"}].map(item=>(
            <article key={item.label} className="rounded-3xl border border-[#e6ded7] p-6 dark:border-stone-700">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">{item.label}</h2>
              <p className="mt-3 text-4xl font-semibold text-[#c94e36] dark:text-[#f2947a]">#{item.rank}</p>
              <p className="mt-2 text-xs leading-5 text-stone-500">of {item.count.toLocaleString()} {item.scope}</p>
              <Link href={item.href} className="mt-4 inline-block text-xs text-[#b44632] hover:underline dark:text-[#f2947a]">{item.link} ›</Link>
            </article>
          ))}
        </section>

        {/* Direct Outrank Challenge Battle Card */}
        <div className="my-8 rounded-3xl border border-[#f0d5cc] bg-gradient-to-br from-[#fff7f5] to-[#fcf0ea] p-6 shadow-sm dark:border-stone-800 dark:from-[#2a1d19] dark:to-[#1e1715]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#c94e36]/10 px-3 py-1 text-xs font-semibold text-[#c94e36] dark:bg-[#f2947a]/20 dark:text-[#f2947a]">
                <span>⚔️</span> Direct Outrank Challenge
              </div>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                Outrank {p.name} for {money(target)}
              </h3>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                Claim the #{detail.categoryRank} spot in {p.category}. Instantly unlocks verified backlink, priority clicks, and real-time live exposure.
              </p>
            </div>
            {target <= 999999 ? (
              <Link
                href={claimHref({targetAmount:target,category:p.category,board:"all_time"})}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#c94e36] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#b44632] transition-transform active:scale-95"
              >
                Claim Spot for {money(target)} →
              </Link>
            ) : (
              <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-stone-200 px-6 py-3 text-sm font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400 cursor-not-allowed">
                Maximum Target Reached
              </span>
            )}
          </div>
        </div>

        <section className="space-y-7 text-sm leading-6">
          <div>
            <h2 className="text-lg font-semibold">About this ranking</h2>
            <p className="mt-3 text-stone-500">The listing has {detail.raiseCount} verified placement payment{detail.raiseCount===1?"":"s"}{detail.latestRaiseAt?`, most recently ${ageLabel(detail.latestRaiseAt)}`:""}. {p.click_count.toLocaleString()} recorded clicks have opened this product.</p>
          </div>
          <div>
            <h2 className="font-medium">What rank does {p.name} hold?</h2>
            <p className="mt-2 text-stone-500">{p.name} has {money(p.amount_paid)} in eligible verified spend and currently ranks #{detail.categoryRank} of {detail.categoryCount.toLocaleString()} in {p.category}, and #{detail.overallRank} of {detail.overallCount.toLocaleString()} overall.</p>
          </div>
          <div>
            <h2 className="font-medium">Has {p.name} ranked today?</h2>
            <p className="mt-2 text-stone-500">{detail.today?`Yes. ${money(detail.today.amountCents/100)} in eligible verified spend since midnight UTC places it #${detail.today.overallRank} overall today${detail.today.categoryRank?` and #${detail.today.categoryRank} in ${p.category}`:""}.`:"This listing has no eligible verified spend since midnight UTC, so it is not on today’s board."} <Link href={feedHref("today",p.category)} className="text-[#b44632] hover:underline dark:text-[#f2947a]">See today’s ranking ›</Link></p>
          </div>
          <div>
            <h2 className="font-medium">How do I outrank {p.name}?</h2>
            <p className="mt-2 text-stone-500">{target<=999999?<>A new product can target this position for {money(target)} on the {p.category} board. Existing listings pay only the additional amount confirmed at checkout. <Link href={claimHref({targetAmount:target,category:p.category,board:"all_time"})} className="text-[#b44632] hover:underline dark:text-[#f2947a]">Choose a placement ›</Link></>:"This placement has reached the maximum supported target."}</p>
          </div>
        </section>

        <section className="mt-10 border-t border-[#e6ded7] pt-7 dark:border-stone-700">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">Also in {p.category}</h2>
            <Link href={feedHref("all_time",p.category)} className="shrink-0 text-xs text-[#b44632] dark:text-[#f2947a]">See all ›</Link>
          </div>
          {detail.related.length?<ol className="mt-4 space-y-1">{detail.related.map(related=><li key={related.id}><Link href={`/product/${related.id}`} className="flex items-center gap-3 border-b border-[#eee6df] py-3 text-xs hover:text-[#b44632] dark:border-stone-800"><span className="w-6 text-stone-500">#{related.rank_position}</span><span className="min-w-0 flex-1 truncate">{related.name}</span><span className="font-medium text-[#c94e36] dark:text-[#f2947a]">{money(related.amount_paid)}</span></Link></li>)}</ol>:<p className="mt-4 text-xs text-stone-500">No other verified placements in this category yet.</p>}
        </section>

        <details className="mt-9 border-t border-[#e6ded7] pt-5 dark:border-stone-700">
          <summary className="cursor-pointer text-sm font-medium">Verified placement history</summary>
          <div className="mt-4">{detail.history.map((payment,index)=><div key={index} className="flex flex-wrap justify-between gap-3 border-b border-[#eee6df] py-3 text-xs dark:border-stone-800"><time dateTime={utcDate(payment.confirmedAt)?.toISOString()}>{utcDate(payment.confirmedAt)?.toLocaleString("en-US",{timeZone:"UTC"})} UTC</time><span>{money(payment.netCents/100)} · {payment.status}</span></div>)}</div>
          <p className="mt-4 text-[11px] text-stone-500">Latest 50 records. Payment references and account details stay private.</p>
        </details>
      </main>
      <Footer/>
    </div>
  );
}
