import { NextRequest, NextResponse } from "next/server";
import { getPublicProduct } from "@/lib/public-views";

export const dynamic = "force-dynamic";

function sanitize(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const detail = getPublicProduct(id);

  let rankText = "Verified";
  let labelText = "RankBid";

  if (detail) {
    const rank = detail.overallRank || detail.categoryRank;
    const cat = detail.product.category && detail.product.category !== "All" ? detail.product.category : "Overall";
    rankText = `#${rank} ${cat}`;
    labelText = detail.product.name ? Array.from(detail.product.name).slice(0, 16).join("") : "RankBid";
  }

  const safeRank = sanitize(rankText);
  const safeLabel = sanitize(labelText);

  // SVG badge layout
  const labelWidth = Math.max(70, safeLabel.length * 7.5 + 28);
  const rankWidth = Math.max(65, safeRank.length * 7.2 + 20);
  const totalWidth = Math.round(labelWidth + rankWidth);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="28" viewBox="0 0 ${totalWidth} 28" fill="none" role="img" aria-label="${safeLabel}: ${safeRank}">
  <title>${safeLabel}: ${safeRank} on RankBid</title>
  <clipPath id="r">
    <rect width="${totalWidth}" height="28" rx="14" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="28" fill="#1c1917"/>
    <rect x="${labelWidth}" width="${rankWidth}" height="28" fill="#c94e36"/>
    <!-- RankBid Arrow Icon -->
    <path d="M12 18L16.5 13.5L19 16L24 10.5M24 10.5H20.5M24 10.5V14" stroke="#f2947a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Label -->
    <text x="${labelWidth / 2 + 10}" y="18" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="11" font-weight="600" text-anchor="middle">${safeLabel}</text>
    <!-- Rank text -->
    <text x="${labelWidth + rankWidth / 2}" y="18" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="11" font-weight="700" text-anchor="middle">${safeRank}</text>
  </g>
</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
