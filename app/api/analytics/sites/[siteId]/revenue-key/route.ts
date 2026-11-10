import { NextRequest, NextResponse } from "next/server";
import { getUser, limited, sameOrigin } from "@/lib/auth";
import { rotateAnalyticsRevenueKey, getOwnedAnalyticsSite } from "@/lib/analytics-sites";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const user = getUser(req), { siteId } = await params;
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (limited(req, "analytics-revenue-key", 4)) return NextResponse.json({ error: "Wait before rotating this key again." }, { status: 429 });
  if (!getOwnedAnalyticsSite(user.id, siteId)) return NextResponse.json({ error: "Website not found." }, { status: 404 });
  const key = rotateAnalyticsRevenueKey(user.id, siteId);
  if (!key) return NextResponse.json({ error: "Revenue setup could not be created." }, { status: 500 });
  return NextResponse.json({ key }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
