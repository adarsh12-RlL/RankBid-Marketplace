import { NextRequest, NextResponse } from "next/server";
import { getUser, limited, sameOrigin } from "@/lib/auth";
import { setAnalyticsShare } from "@/lib/analytics-sites";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const user = getUser(req), { siteId } = await params;
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (limited(req, "analytics-site-share", 10)) return NextResponse.json({ error: "Wait before changing share settings again." }, { status: 429 });
  let enabled: unknown;
  try { enabled = (await req.json()).enabled; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof enabled !== "boolean") return NextResponse.json({ error: "Choose whether this report is shared." }, { status: 400 });
  const share = setAnalyticsShare(user.id, siteId, enabled);
  if (!share) return NextResponse.json({ error: "Website not found." }, { status: 404 });
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  return NextResponse.json({ enabled: share.enabled, shareUrl: share.enabled ? new URL("/share/" + share.token, appOrigin).toString() : "" },
    { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
