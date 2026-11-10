import { NextRequest, NextResponse } from "next/server";
import { getUser, limited, sameOrigin } from "@/lib/auth";
import { rotateAnalyticsBotToken } from "@/lib/analytics-bots";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (limited(req, "analytics-bot-token:" + user.id, 6)) return NextResponse.json({ error: "Too many token changes. Wait and try again." }, { status: 429 });
  const { siteId } = await params;
  const token = rotateAnalyticsBotToken(user.id, siteId);
  if (!token) return NextResponse.json({ error: "Website not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
}
