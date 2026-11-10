"use client";

import { useEffect, useState } from "react";
import CopyLinkButton from "./CopyLinkButton";
import { Code, Check } from "lucide-react";

function escapeHtmlAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function ProductActions({
  id,
  url,
  name,
  rank,
  category,
}: {
  id: number;
  url: string;
  name?: string;
  rank?: number;
  category?: string;
}) {
  const [showEmbed, setShowEmbed] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://rankbid-marketplacelive.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  const productName = name || "Product";
  const currentRank = rank ? `#${rank}` : "Ranked";
  const productUrl = `${origin}/product/${id}`;
  const badgeUrl = `${origin}/api/badge/${id}`;

  const tweetText = `🔥 Check out ${productName} — ranked ${currentRank}${category ? ` in ${category}` : ""} on the @RankBid public leaderboard! Can you outbid us? 🚀`;
  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(productUrl)}`;

  const safeAlt = escapeHtmlAttr(`${productName} on RankBid`);
  const markdownSnippet = `[![RankBid Rank](${badgeUrl})](${productUrl})`;
  const htmlSnippet = `<a href="${productUrl}" target="_blank" rel="noopener noreferrer"><img src="${badgeUrl}" alt="${safeAlt}" /></a>`;

  const copySnippet = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }).catch(() => {});
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => {
              void fetch(`/api/products/${id}/click`, { method: "POST" }).catch(() => {});
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#c94e36] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#b44632] transition"
          >
            Visit ↗
          </a>
        )}

        <a
          href={tweetHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#e6ded7] bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-sm hover:border-[#c94e36] hover:text-[#b44632] dark:border-stone-700 dark:bg-[#202020] dark:text-stone-300 dark:hover:text-[#f2947a] transition"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Share on X
        </a>

        <button
          type="button"
          onClick={() => setShowEmbed((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#e6ded7] bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-sm hover:border-[#c94e36] hover:text-[#b44632] dark:border-stone-700 dark:bg-[#202020] dark:text-stone-300 dark:hover:text-[#f2947a] transition"
        >
          <Code size={13} />
          {showEmbed ? "Hide Badge" : "Get Embed Badge"}
        </button>

        <CopyLinkButton />
      </div>

      {showEmbed && (
        <div className="rounded-2xl border border-[#e6ded7] bg-[#fbf7f4] p-4 text-xs dark:border-stone-700 dark:bg-[#1e1b18]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eee3db] pb-3 dark:border-stone-700">
            <div>
              <p className="font-semibold text-stone-900 dark:text-stone-100">Live Dynamic Badge</p>
              <p className="text-[11px] text-stone-500">Embed this live badge on your GitHub README, website or blog to show your verified rank.</p>
            </div>
            <div className="shrink-0">
              <img src={badgeUrl} alt={`${productName} Rank Badge`} className="h-7 w-auto" />
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div>
              <div className="flex items-center justify-between py-1 text-[11px]">
                <span className="font-mono text-stone-500">Markdown (GitHub README)</span>
                <button
                  type="button"
                  onClick={() => copySnippet(markdownSnippet, "md")}
                  className="inline-flex items-center gap-1 text-[#b44632] hover:underline dark:text-[#f2947a]"
                >
                  {copiedType === "md" ? <Check size={11} className="text-emerald-600"/> : null}
                  {copiedType === "md" ? "Copied!" : "Copy"}
                </button>
              </div>
              <input
                readOnly
                value={markdownSnippet}
                className="w-full rounded-lg border border-[#e6ded7] bg-white px-2.5 py-1.5 font-mono text-[11px] text-stone-700 outline-none dark:border-stone-700 dark:bg-[#151515] dark:text-stone-300"
              />
            </div>

            <div>
              <div className="flex items-center justify-between py-1 text-[11px]">
                <span className="font-mono text-stone-500">HTML (Website & Blog)</span>
                <button
                  type="button"
                  onClick={() => copySnippet(htmlSnippet, "html")}
                  className="inline-flex items-center gap-1 text-[#b44632] hover:underline dark:text-[#f2947a]"
                >
                  {copiedType === "html" ? <Check size={11} className="text-emerald-600"/> : null}
                  {copiedType === "html" ? "Copied!" : "Copy"}
                </button>
              </div>
              <input
                readOnly
                value={htmlSnippet}
                className="w-full rounded-lg border border-[#e6ded7] bg-white px-2.5 py-1.5 font-mono text-[11px] text-stone-700 outline-none dark:border-stone-700 dark:bg-[#151515] dark:text-stone-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
