import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getUser, limited, sameOrigin } from "@/lib/auth";
import { getOwnedAnalyticsSite, normalizeAnalyticsTimezone } from "@/lib/analytics-sites";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const user = getUser(req), { siteId } = await params;
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (limited(req, "analytics-site-timezone", 12)) return NextResponse.json({ error: "Wait before changing this setting again." }, { status: 429 });

  let input: unknown;
  try { input = (await req.json()).timezone; }
  catch { return NextResponse.json({ error: "Choose a valid timezone." }, { status: 400 }); }

  let timezone: string;
  try { timezone = normalizeAnalyticsTimezone(input); }
  catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Choose a valid timezone." }, { status: 400 });
  }

  if (!getOwnedAnalyticsSite(user.id, siteId)) return NextResponse.json({ error: "Website not found." }, { status: 404 });
  getDb().prepare("UPDATE analytics_sites SET timezone=? WHERE id=? AND owner_id=?").run(timezone, siteId, user.id);
  return NextResponse.json({ ok: true, timezone }, { headers: { "Cache-Control": "no-store" } });
}
