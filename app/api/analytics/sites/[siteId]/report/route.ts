import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { analyticsSiteReport, getOwnedAnalyticsSite } from "@/lib/analytics-sites";
import { ANALYTICS_PERIODS, DIMENSIONS, type AnalyticsFilter } from "@/lib/analytics-types";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { siteId } = await params, site = getOwnedAnalyticsSite(user.id, siteId);
  if (!site) return NextResponse.json({ error: "Website not found." }, { status: 404 });
  const q = req.nextUrl.searchParams, period = q.get("period") || "last24h", granularity = q.get("granularity") === "daily" ? "daily" : "hourly";
  if (!(ANALYTICS_PERIODS as readonly string[]).includes(period)) return NextResponse.json({ error: "Invalid period." }, { status: 400 });
  const rawOffset = q.get("offset") || "0";
  if (!/^\d{1,2}$/.test(rawOffset) || Number(rawOffset) > 60) return NextResponse.json({ error: "Invalid offset." }, { status: 400 });
  let filters: AnalyticsFilter[];
  try {
    filters = JSON.parse(q.get("filters") || "[]");
    if (!Array.isArray(filters) || filters.length > 5 || filters.some(f => !f || typeof f !== "object" ||
      !DIMENSIONS.includes(f.dimension) || typeof f.value !== "string" || f.value.length > 256 ||
      !["is", "is_not", "contains", "not_contains"].includes(f.operator || "is"))) throw new Error();
  } catch { return NextResponse.json({ error: "Invalid filters." }, { status: 400 }); }
  try {
    const range = period === "custom" ? { from: q.get("from") || "", to: q.get("to") || "" } : undefined;
    return NextResponse.json(analyticsSiteReport(site, period, granularity, filters, Number(rawOffset), new Date(), range, undefined, q.get("realtime") === "1"),
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RangeError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Site analytics are temporarily unavailable." }, { status: 503 });
  }
}
