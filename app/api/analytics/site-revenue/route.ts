import { NextRequest, NextResponse } from "next/server";
import { limited } from "@/lib/auth";
import { recordAnalyticsSiteRevenue, verifyAnalyticsRevenueKey } from "@/lib/analytics-sites";

export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  if (limited(req, "analytics-site-revenue", 120)) return NextResponse.json({ error: "Rate limited." }, { status: 429 });
  try {
    if (Number(req.headers.get("content-length") || 0) > 4096) throw new RangeError("Request is too large.");
    const siteId = req.nextUrl.searchParams.get("siteId") || "";
    if (!/^rl_[A-Za-z0-9_-]{20,40}$/.test(siteId) || !verifyAnalyticsRevenueKey(siteId, req.headers.get("authorization")))
      return NextResponse.json({ error: "Invalid revenue API key." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const body = await req.json();
    return NextResponse.json(recordAnalyticsSiteRevenue(siteId, body), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RangeError ? error.message : "Revenue event could not be recorded." },
      { status: error instanceof RangeError ? 400 : 500, headers: { "Cache-Control": "no-store" } });
  }
}
