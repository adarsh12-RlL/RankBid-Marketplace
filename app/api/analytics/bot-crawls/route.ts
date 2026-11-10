import { NextRequest, NextResponse } from "next/server";
import { limited } from "@/lib/auth";
import { recordAnalyticsBotEvent, verifyAnalyticsBotToken } from "@/lib/analytics-bots";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get("siteId") || "";
  if (!/^rl_[A-Za-z0-9_-]{20,40}$/.test(siteId) || !verifyAnalyticsBotToken(siteId, req.headers.get("authorization")))
    return NextResponse.json({ error: "Invalid website bot token." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (limited(req, "analytics-bot-crawl:" + siteId, 120))
    return NextResponse.json({ error: "Rate limited." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  try {
    if (Number(req.headers.get("content-length") || 0) > 16384) throw new RangeError("Request is too large.");
    const body = await req.json();
    const result = recordAnalyticsBotEvent(siteId, body);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RangeError ? error.message : "Crawler event could not be recorded." },
      { status: error instanceof RangeError ? 400 : 500, headers: { "Cache-Control": "no-store" } });
  }
}
