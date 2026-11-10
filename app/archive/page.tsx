import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { getArchivePreviews, publicListing } from "@/lib/public-views";
import { getProducts } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export default async function Archive({ searchParams }: { searchParams?: Promise<{ page?: string }> }) {
  const query = await searchParams;
  const archive = getArchivePreviews(query?.page);
  const todayFeed = getProducts({ board: "today", limit: 20 });
  const todayListings = todayFeed.products.map(publicListing);

  return (
    <div className="rankbid-page">
      <Header />
      <main className="rankbid-page-main">
        <section className="rankbid-page-heading flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="rankbid-page-kicker">RankBid · Daily Leaderboard</span>
            <h1>Daily rankings</h1>
            <p>Live rankings update in real-time as bids are placed. Previous closed days are frozen permanently in the UTC archive.</p>
            {archive.isTest && <span className="mt-4 inline-flex rounded-full border border-[#dbe5ef] bg-white/70 px-3 py-1.5 text-[11px] font-medium text-[#536b83] dark:border-[#34485d] dark:bg-[#142233] dark:text-[#b7c8d9]">Test archive · no real money</span>}
          </div>
          <Link href="/submit?board=today" className="relative z-10 inline-flex items-center rounded-full bg-[#c94e36] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#b44632] shadow-sm">
            Claim placement today <span className="ml-1">›</span>
          </Link>
        </section>

        {/* Section 1: Today's Active Live Leaderboard */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-bold tracking-tight text-stone-900 dark:text-stone-100">
                Today’s Live Board
              </h2>
            </div>
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              {todayListings.length} competing product{todayListings.length === 1 ? "" : "s"}
            </span>
          </div>

          {todayListings.length > 0 ? (
            <div className="max-w-3xl space-y-2">
              {todayListings.map((product) => (
                <ProductCard key={product.id} product={product} board="today" allowClaim={true} />
              ))}
            </div>
          ) : (
            <div className="max-w-3xl rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 p-8 text-center">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">The leaderboard is open for today!</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Be the first product to claim the #1 spot on today’s leaderboard.</p>
              <Link href="/submit?board=today" className="mt-4 inline-flex items-center rounded-full bg-[#c94e36] text-white text-xs font-semibold px-4 py-2 hover:bg-[#b44632]">
                Claim #1 Spot Now
              </Link>
            </div>
          )}
        </section>

        {/* Section 2: Previous Days UTC Archive */}
        <section className="border-t border-stone-200 dark:border-stone-800 pt-8">
          <div className="mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Previous Days Archive
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Each closed UTC day is frozen when archived. Payments and refunds after close do not alter historic ranks.
            </p>
          </div>

          {archive.days.length ? (
            <div className="space-y-5">
              {archive.days.map((day) => (
                <section key={day.date} className="rankbid-archive-group">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold tracking-tight">
                        <time dateTime={day.date}>
                          {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(day.date + "T00:00:00Z"))}
                        </time>
                      </h3>
                      <p className="mt-1 text-[11px] text-stone-500 dark:text-slate-400">
                        UTC · {day.total} visible placement{day.total === 1 ? "" : "s"} · frozen board
                      </p>
                    </div>
                    <Link href={`/archive/${day.date}`} className="shrink-0 rounded-full px-3 py-2 text-xs font-medium text-[#2877bd] hover:bg-[#e8f1fa] dark:text-[#8bc0ee] dark:hover:bg-[#203349]">
                      View day <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                  <div className="max-w-3xl space-y-2">
                    {day.products.map((product) => (
                      <ProductCard key={product.id} product={product} board="today" allowClaim={false} />
                    ))}
                    {!day.products.length && (
                      <p className="rounded-xl bg-[#edf3f9] px-4 py-5 text-xs text-stone-500 dark:bg-[#1a2a3a] dark:text-slate-400">
                        No visible placements in this saved board.
                      </p>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rankbid-page-empty">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-[#2877bd] dark:text-[#8bc0ee]">
                History will appear here
              </span>
              <p className="text-sm leading-6">Previous UTC days will appear as daily snapshots are frozen at UTC midnight.</p>
            </div>
          )}

          {archive.pages > 1 && (
            <nav aria-label="Daily archive pages" className="mt-9 flex items-center justify-center gap-5 text-xs">
              {archive.page > 1 && (
                <Link href={`/daily?page=${archive.page - 1}`} className="font-medium text-[#2877bd] dark:text-[#8bc0ee]">
                  ‹ Newer days
                </Link>
              )}
              <span className="text-stone-500 dark:text-slate-400">Page {archive.page} of {archive.pages}</span>
              {archive.page < archive.pages && (
                <Link href={`/daily?page=${archive.page + 1}`} className="font-medium text-[#2877bd] dark:text-[#8bc0ee]">
                  Older days ›
                </Link>
              )}
            </nav>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
