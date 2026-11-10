import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getOwnedAnalyticsSite } from "@/lib/analytics-sites";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { siteId } = await params, site = getOwnedAnalyticsSite(user.id, siteId);
  if (!site) return NextResponse.json({ error: "Website not found." }, { status: 404 });
  return NextResponse.json({ site }, { headers: { "Cache-Control": "no-store" } });
}
