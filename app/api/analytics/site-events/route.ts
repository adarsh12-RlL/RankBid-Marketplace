import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { limited } from "@/lib/auth";
import { addAnalyticsSiteEvent, ensureAnalyticsSitesSchema, siteOriginAllowed, type AnalyticsSite } from "@/lib/analytics-sites";
import { countryFromTrustedProxy } from "@/lib/analytics-geo";

export const dynamic = "force-dynamic";
const corsHeaders = (origin: string) => ({ "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600", "Cache-Control": "no-store", Vary: "Origin" });
function findSite(siteId: string) {
  if (!/^rl_[A-Za-z0-9_-]{20,40}$/.test(siteId)) return undefined;
  ensureAnalyticsSitesSchema();
  return getDb().prepare("SELECT id,owner_id,domain,timezone,created_at FROM analytics_sites WHERE id=?").get(siteId) as AnalyticsSite | undefined;
}
function allowed(req: NextRequest, siteId: string) {
  const site = findSite(siteId), origin = req.headers.get("origin");
  return site && origin && siteOriginAllowed(origin, site.domain) ? { site, origin } : null;
}
export async function OPTIONS(req: NextRequest) {
  const found = allowed(req, req.nextUrl.searchParams.get("siteId") || "");
  if (!found) return new NextResponse(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(null, { status: 204, headers: corsHeaders(found.origin) });
}
export async function POST(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get("siteId") || "", found = allowed(req, siteId);
  if (!found) return NextResponse.json({ error: "Website origin is not allowed." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (limited(req, "analytics-site-event:" + siteId, 180)) return NextResponse.json({ error: "Rate limited." }, { status: 429, headers: corsHeaders(found.origin) });
  try {
    if (Number(req.headers.get("content-length") || 0) > 4096) throw new RangeError("Event is too large.");
    const body = await req.json();
    const result = addAnalyticsSiteEvent(found.site, body, req.headers.get("user-agent") || "", undefined, countryFromTrustedProxy(req.headers));
    return NextResponse.json(result, { headers: corsHeaders(found.origin) });
  } catch (error) {
    const message = error instanceof RangeError ? error.message : "Invalid analytics event.";
    return NextResponse.json({ error: message }, { status: 400, headers: corsHeaders(found.origin) });
  }
}
