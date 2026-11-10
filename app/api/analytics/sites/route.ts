import { NextRequest, NextResponse } from "next/server";
import { getUser, limited, sameOrigin } from "@/lib/auth";
import { createAnalyticsSite, ensureAnalyticsSitesSchema, listAnalyticsSites } from "@/lib/analytics-sites";
import { hasAnalyticsBotAccess } from "@/lib/analytics-plan";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Please sign in with Google." }, { status: 401 });
  return NextResponse.json({ sites: listAnalyticsSites(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Please sign in with Google." }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (limited(req, "analytics-site-create", 8)) return NextResponse.json({ error: "Too many attempts. Wait and try again." }, { status: 429 });
  try {
    if (Number(req.headers.get("content-length") || 0) > 4096) throw new RangeError("Request is too large.");
    const body = await req.json();
    const db=getDb();ensureAnalyticsSitesSchema(db);
    const count=(db.prepare("SELECT count(*) AS count FROM analytics_sites WHERE owner_id=?").get(user.id) as {count:number}).count;
    const limit=hasAnalyticsBotAccess(user.id)?20:1;
    if(count>=limit)return NextResponse.json({error:limit===1?"The free plan includes one website. Choose a RankLens Pro plan to add up to 20 websites.":"RankLens Pro supports up to 20 websites per account."},{status:403});
    const site = createAnalyticsSite(user.id, body.domain, body.timezone || "Asia/Calcutta", db);
    return NextResponse.json({ site }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RangeError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (String(error).includes("UNIQUE constraint failed: analytics_sites.owner_id, analytics_sites.domain"))
      return NextResponse.json({ error: "This website is already in your RankLens dashboard." }, { status: 409 });
    return NextResponse.json({ error: "Website could not be added. Try again." }, { status: 500 });
  }
}
