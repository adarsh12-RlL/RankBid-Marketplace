import Link from "next/link";
import LocationSharingControl from "./LocationSharingControl";

export default function Footer() {
  const officialSiteUrl = process.env.NEXT_PUBLIC_OFFICIAL_SITE_URL || "https://rankbid-official.vercel.app";

  return (
    <footer className="rankbid-footer bg-[#fdfbf8] text-stone-500 dark:bg-[#171717] dark:text-stone-400">
      <div className="mx-auto max-w-[1024px] px-4 pt-4 pb-8 text-center text-[11px]">
        <p>RankBid · Public paid placements, ranked by recorded spend.</p>
        <nav aria-label="Footer navigation" className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
          {[
            ["Rules", "/rules"],
            ["FAQ", "/faq"],
            ["Games", "/games"],
            ["Companies", "/companies"],
            ["Feedback & reviews", "/feedback"],
            ["Terms", "/terms"],
            ["Privacy", "/privacy"],
            ["Contact", "/contact"],
            ["Operator details", "/imprint"]
          ].map(([name, href]) => (
            <Link key={href} href={href} className="hover:text-[#b44632] dark:hover:text-[#f2947a]">
              {name}
            </Link>
          ))}
          <Link href="/stats" className="hover:text-[#b44632] dark:hover:text-[#f2947a]">Public stats ↗</Link>
          <Link href="/datafast" className="hover:text-[#b44632] dark:hover:text-[#f2947a]">RankLens Home ↗</Link>
        </nav>
        <LocationSharingControl />
        <p className="mt-4 text-[10px] text-stone-400">Placement does not guarantee traffic, customers or sales.</p>
        <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© {new Date().getFullYear()} RankBid. All rights reserved.</span>
          <a
            href={officialSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-[#b44632] dark:text-[#f2947a] hover:underline text-xs"
          >
            <span>RankBid Official Website</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
