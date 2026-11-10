"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Check, Copy, Download, Image as ImageIcon, ShieldCheck } from "lucide-react";

type Entry = { name: string; domain: string; category: string; amount_paid: number; rank_position: number };
type Board = "today" | "all_time";
type Format = "square" | "story";
type Props = { today: Entry[]; allTime: Entry[]; testMode: boolean };

const CHANNELS = [
  { name: "Product Hunt", use: "Launch RankBid when a public, tryable product is ready. Join the discussion and ask for feedback, not votes.", href: "https://www.producthunt.com/launch" },
  { name: "Show HN", use: "Share a working product with a clear demo. Be available to explain how its paid ranking works.", href: "https://news.ycombinator.com/showhn.html" },
  { name: "LinkedIn", use: "Use a Company Page and post transparent Top 3 updates for startup and business audiences.", href: "https://www.linkedin.com/help/linkedin/answer/a727893" },
  { name: "Reddit", use: "Join relevant communities first, follow each community's rules, and avoid repetitive self-promotion.", href: "https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam" },
];

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}

export default function AdminPromotionStudio({ today, allTime, testMode }: Props) {
  const [board, setBoard] = useState<Board>("today");
  const [format, setFormat] = useState<Format>("square");
  const [count, setCount] = useState<3 | 10 | 20>(3);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const products = board === "today" ? today : allTime;
  const entries = useMemo(() => products.slice(0, count), [products, count]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const width = 1080, height = format === "square" ? 1080 : 1920;
    canvas.width = width; canvas.height = height;
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#101b29"); bg.addColorStop(.56, "#1b3047"); bg.addColorStop(1, "#17232f");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(123,188,238,.16)";
    for (let y = 38; y < height; y += 34) for (let x = 28; x < width; x += 34) ctx.fillRect(x, y, 2, 2);

    const pad = format === "square" ? 76 : 82;
    ctx.fillStyle = "#8bc9f2"; ctx.font = "700 22px Segoe UI, Arial";
    ctx.fillText("RANKBID  /  VERIFIED SPEND RANKING", pad, 80);
    ctx.fillStyle = "#f7f9fc"; ctx.font = `750 ${format === "square" ? 62 : 76}px Segoe UI, Arial`;
    ctx.fillText(`TOP ${count}`, pad, format === "square" ? 170 : 190);
    ctx.fillStyle = "#f28a58"; ctx.font = "650 27px Segoe UI, Arial";
    ctx.fillText(board === "today" ? "TODAY'S BOARD · UTC" : "ALL-TIME BOARD", pad, format === "square" ? 220 : 246);
    if (testMode) {
      ctx.fillStyle = "#ffbd91"; ctx.font = "800 24px Segoe UI, Arial";
      ctx.fillText("TEST DATA — NOT FOR PUBLICATION", pad, format === "square" ? 270 : 298);
    }

    const startY = format === "square" ? 312 : 360;
    const available = height - startY - 170;
    const gap = count === 20 ? (format === "square" ? 3 : 7) : count === 10 ? 8 : 14;
    const rowHeight = Math.min(format === "square" ? 125 : 135, (available - gap * Math.max(0, entries.length - 1)) / Math.max(1, entries.length));
    const dense = count === 20;
    entries.forEach((entry, index) => {
      const y = startY + index * (rowHeight + gap);
      ctx.fillStyle = index === 0 ? "rgba(239,122,75,.18)" : "rgba(125,178,219,.11)";
      roundedRect(ctx, pad, y, width - pad * 2, rowHeight, Math.min(18, rowHeight / 3));
      ctx.fillStyle = index === 0 ? "#f28a58" : "#8bc9f2";
      ctx.font = `800 ${Math.min(dense ? (format === "square" ? 20 : 30) : 33, rowHeight * (dense ? .72 : .42))}px Segoe UI, Arial`;
      ctx.fillText(`#${index + 1}`, pad + 20, y + rowHeight * .62);
      const titleX = pad + 112;
      ctx.fillStyle = "#f7f9fc"; ctx.font = `700 ${Math.min(dense ? (format === "square" ? 14 : 25) : 27, rowHeight * (dense ? .48 : .31))}px Segoe UI, Arial`;
      const name = entry.name.length > 35 ? `${entry.name.slice(0, 34)}…` : entry.name;
      ctx.fillText(name, titleX, y + rowHeight * .42, width - titleX - pad - 175);
      ctx.fillStyle = "#b6c9dc"; ctx.font = `500 ${Math.min(dense ? (format === "square" ? 10 : 16) : 18, rowHeight * (dense ? .29 : .21))}px Segoe UI, Arial`;
      ctx.fillText(`${entry.domain}  ·  ${entry.category}`, titleX, y + rowHeight * .77, width - titleX - pad - 165);
      ctx.textAlign = "right"; ctx.fillStyle = "#f28a58"; ctx.font = `750 ${Math.min(dense ? (format === "square" ? 13 : 23) : 26, rowHeight * (dense ? .42 : .29))}px Segoe UI, Arial`;
      ctx.fillText(`$${Number(entry.amount_paid).toLocaleString("en-US", { maximumFractionDigits: 2 })}`, width - pad - 20, y + rowHeight * .62);
      ctx.textAlign = "left";
    });
    if (!entries.length) {
      ctx.fillStyle = "rgba(9,18,29,.62)"; roundedRect(ctx, pad, startY, width - pad * 2, 150, 18);
      ctx.fillStyle = "#f5f8fc"; ctx.font = "650 25px Segoe UI, Arial";
      ctx.fillText("No verified placements in this period yet.", pad + 26, startY + 86);
    }
    if (testMode) {
      ctx.save(); ctx.translate(width / 2, height / 2); ctx.rotate(-.34);
      ctx.fillStyle = "rgba(242,138,88,.18)"; ctx.font = "900 104px Segoe UI, Arial"; ctx.textAlign = "center";
      ctx.fillText("TEST DATA", 0, 0); ctx.restore();
    }
    ctx.fillStyle = "#b6c9dc"; ctx.font = "500 17px Segoe UI, Arial";
    ctx.fillText("Paid placements ranked by confirmed spend · Not an endorsement", pad, height - 82);
    ctx.fillStyle = "#8bc9f2"; ctx.font = "600 15px Segoe UI, Arial";
    ctx.fillText("Traffic, customers, or sales are not guaranteed.", pad, height - 53);
    ctx.fillStyle = "#f7f9fc"; ctx.font = "700 19px Segoe UI, Arial"; ctx.textAlign = "right";
    ctx.fillText("RankBid", width - pad, height - 53); ctx.textAlign = "left";
  }, [board, count, entries, format, testMode]);

  async function copyCaption() {
    const range = board === "today" ? "today's" : "all-time";
    const names = entries.slice(0, 3).map((entry, i) => `${i + 1}. ${entry.name} (${entry.domain})`).join("\n");
    const text = `${testMode ? "TEST DATA — DO NOT PUBLISH\n" : ""}RankBid ${range} Top ${count}, ranked by confirmed paid spend:\n${names || "No verified placements yet."}\n\nPaid placement ranking, not an endorsement. Traffic or sales are not guaranteed.`;
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rankbid-${board}-top-${count}-${format}${testMode ? "-TEST-DATA" : ""}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return <div className="space-y-6">
    <section className="rounded-2xl border border-[#31465c] bg-[#142235] p-5 sm:p-7 text-[#f4f8fc]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="inline-flex items-center gap-2 text-xs font-bold tracking-[.14em] text-[#8bc9f2]"><ImageIcon size={15}/> RANKBID PROMOTION STUDIO</span><h2 className="mt-2 text-2xl font-bold">Create a ranking graphic</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#afc2d5]">Prepare Top 3, Top 10, or Top 20 posts and stories from the verified payment leaderboard. Review the image and caption before posting yourself.</p></div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#38536f] px-3 py-2 text-xs text-[#c2d7e9]"><ShieldCheck size={15}/> No automatic posting</span>
      </div>
      {testMode && <div role="status" className="mt-5 rounded-xl border border-[#cf714d] bg-[#33251f] p-4 text-sm text-[#ffd0b5]"><b>Test payment mode is active.</b> Every downloaded image and caption is watermarked TEST DATA — NOT FOR PUBLICATION.</div>}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold">Leaderboard<select className="rounded-lg border border-[#3b536a] bg-[#0e1927] p-3 text-[#f4f8fc]" value={board} onChange={(e) => setBoard(e.target.value as Board)}><option value="today">Today</option><option value="all_time">All-time</option></select></label>
        <label className="grid gap-2 text-sm font-semibold">Ranking image<select className="rounded-lg border border-[#3b536a] bg-[#0e1927] p-3 text-[#f4f8fc]" value={count} onChange={(e) => setCount(Number(e.target.value) as 3 | 10 | 20)}><option value={3}>Top 3</option><option value={10}>Top 10</option><option value={20}>Top 20</option></select></label>
        <label className="grid gap-2 text-sm font-semibold">Social format<select className="rounded-lg border border-[#3b536a] bg-[#0e1927] p-3 text-[#f4f8fc]" value={format} onChange={(e) => setFormat(e.target.value as Format)}><option value="square">Square · 1080 × 1080</option><option value="story">Story · 1080 × 1920</option></select></label>
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.72fr)]">
        <div className="overflow-hidden rounded-xl border border-[#354d65] bg-[#0b1420]">
          <canvas ref={canvasRef} className="block h-auto max-h-[760px] w-full object-contain" aria-label={`${board} Top ${count} promotion graphic`} />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-[#334c65] bg-[#182a3f] p-4"><h3 className="font-bold">Included in the graphic</h3><ul className="mt-3 space-y-2 text-sm leading-5 text-[#c0d1e1]"><li>• Only verified paid placements</li><li>• Rank, product, domain, category, and spend</li><li>• Clear paid-ranking and no-guarantee disclosure</li>{testMode && <li className="font-bold text-[#ffbb97]">• Visible test-data watermark</li>}</ul></div>
          <p className="text-xs leading-5 text-[#a9bed2]">Before a public post, switch to live payment mode and verify that the selected board contains real, confirmed payments. A paid rank is not a product endorsement.</p>
          <div className="flex flex-wrap gap-3"><button type="button" onClick={download} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#ef8858] bg-[#e9683c] px-4 font-bold text-white hover:bg-[#cf5731]"><Download size={16}/> Download PNG</button><button type="button" onClick={copyCaption} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#3b536a] px-4 font-semibold text-[#e7f1fa] hover:border-[#81bfe9]">{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? "Caption copied" : "Copy caption"}</button></div>
        </div>
      </div>
    </section>
    <section className="rounded-2xl border border-[#d7e1ea] bg-white p-5 sm:p-7 dark:border-[#30465c] dark:bg-[#132133]">
      <span className="text-xs font-bold tracking-[.14em] text-[#397eae] dark:text-[#8bc9f2]">LAUNCH AND PROMOTION CHANNELS</span><h2 className="mt-2 text-xl font-bold">Where a public RankBid launch could fit</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-[#b5c7d8]">Use these channels after the public website, privacy notice, payment flow, and review moderation are ready. Follow each community&apos;s own promotion rules.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{CHANNELS.map((channel) => <a key={channel.name} href={channel.href} target="_blank" rel="noreferrer" className="group rounded-xl border border-slate-200 p-4 hover:border-[#df7044] dark:border-[#344b61] dark:bg-[#182a3d]"><div className="flex items-center justify-between gap-3 font-bold">{channel.name}<ArrowUpRight size={15} className="text-[#df7044] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"/></div><p className="mt-2 text-sm leading-5 text-slate-600 dark:text-[#b5c7d8]">{channel.use}</p></a>)}</div>
      <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-[#9bb0c3]">For Top 3 posts or stories, label the graphic as a paid-spend ranking. Do not suggest the ranked companies paid for a social promotion unless you have a separate agreement with them.</p>
    </section>
  </div>;
}
