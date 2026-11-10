import Link from "next/link";
import { ArrowUpRight, Layers3 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { categoryDisplay } from "@/components/category-display";
import { CATEGORIES, categoryToSlug } from "@/lib/utils";
import { getProducts } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export default function Categories() {
  const categories = CATEGORIES.filter((category) => !["All", "Explore"].includes(category)).map((category) => ({
    name: category,
    ...getProducts({ category, limit: 3 }),
    display: categoryDisplay(category),
  }));
  const totalListings = categories.reduce((total, category) => total + category.total, 0);

  return (
    <div className="rankbid-page">
      <Header />
      <main className="rankbid-page-main">
        <section className="rankbid-page-heading">
          <span className="rankbid-page-kicker"><Layers3 size={14} /> Discover RankBid</span>
          <h1>Explore categories</h1>
          <p>Find products by topic, then open a category to see its live ranking and verified placements.</p>
          <span className="mt-4 inline-flex rounded-full border border-[#dbe5ef] bg-white/70 px-3 py-1.5 text-[11px] font-medium text-[#536b83] dark:border-[#34485d] dark:bg-[#142233] dark:text-[#b7c8d9]">
            {categories.length} categories <span className="mx-2 text-[#aab8c6]">·</span> {totalListings} verified listings
          </span>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(({ name, products, total, display }) => {
            const Icon = display.Icon;
            return (
              <Link key={name} href={`/category/${categoryToSlug(name)}`} className="rankbid-category-card group">
                <span className="rankbid-category-icon"><Icon size={19} strokeWidth={1.8} /></span>
                <h2>{name}<ArrowUpRight className="ml-1 inline-block text-[#df6a3c] opacity-0 transition-opacity group-hover:opacity-100" size={14} /></h2>
                {products.length ? products.slice(0, 2).map((product) => (
                  <span key={product.id} className="rankbid-category-listing">
                    <span className="truncate">#{product.rank_position} {product.name}</span>
                    <b>${product.amount_paid.toLocaleString()}</b>
                  </span>
                )) : <p className="rankbid-category-copy">Be the first to claim a verified placement here.</p>}
                <span className="rankbid-category-count">{total} verified {total === 1 ? "listing" : "listings"}<ArrowUpRight size={13} /></span>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
