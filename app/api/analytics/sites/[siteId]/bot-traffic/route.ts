import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getAnalyticsBotReport } from "@/lib/analytics-bots";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { siteId } = await params;
  const report = getAnalyticsBotReport(user.id, siteId);
  if (!report) return NextResponse.json({ error: "Website not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
