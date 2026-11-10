import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col justify-between font-sans">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <span className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-3xl font-extrabold mx-auto mb-6 shadow-sm">
          ⚡
        </span>
        <h1 className="text-3xl font-bold tracking-tight mb-3">Page Not Found</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          The requested page or listing could not be found or has moved. Explore the live RankBid leaderboard or check our verified listings.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
          >
            Back to Leaderboard
          </Link>
          <Link
            href="/stats"
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 hover:border-gray-400 text-xs font-semibold rounded-xl transition-colors"
          >
            Live Analytics
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
