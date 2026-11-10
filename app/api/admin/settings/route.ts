import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getUser, isOwner, sameOrigin, audit } from "@/lib/auth";
const keys = [
  "site_name",
  "site_tagline",
  "min_bid",
  "min_increment",
  "top_bonus",
  "analytics_plan_day_price",
  "analytics_plan_monthly_price",
  "analytics_plan_yearly_price",
  "analytics_plan_day_days",
  "analytics_plan_monthly_days",
  "analytics_plan_yearly_days",
  "analytics_plan_day_markup_percent",
  "analytics_plan_monthly_markup_percent",
  "analytics_plan_yearly_markup_percent",
];
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  if (!isOwner(getUser(req)))
    return NextResponse.json({ error: "Only the owner administrator can view plan and site settings." }, { status: 403 });
  const result: Record<string, string> = {};
  for (const row of getDb()
    .prepare("SELECT key,value FROM admin_settings")
    .all() as any[])
    if (keys.includes(row.key)) result[row.key] = row.value;
  for (const [key,value] of Object.entries({analytics_plan_day_price:"2",analytics_plan_monthly_price:"9",analytics_plan_yearly_price:"79",analytics_plan_day_days:"1",analytics_plan_monthly_days:"30",analytics_plan_yearly_days:"365",analytics_plan_day_markup_percent:"5",analytics_plan_monthly_markup_percent:"10",analytics_plan_yearly_markup_percent:"20"}))
    if (result[key] === undefined) result[key] = value;
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user || !isOwner(user))
    return NextResponse.json({ error: "Only the owner administrator can change plan and site settings." }, { status: 403 });
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const body = await req.json();
    if (
      Object.keys(body).some((k) => !keys.includes(k))
    )
      return NextResponse.json(
        {
          error:
            "Unsupported setting. Payment and bank credentials belong in your provider dashboard/server environment.",
        },
        { status: 400 },
      );
    for (const k of ["min_bid", "min_increment", "top_bonus"])
      if (
        body[k] !== undefined &&
        (!/^\d+$/.test(String(body[k])) ||
          Number(body[k]) < 1 ||
          Number(body[k]) > 1000000)
      )
        throw Error("Pricing settings must be positive whole dollars");
    for (const k of ["analytics_plan_day_price","analytics_plan_monthly_price","analytics_plan_yearly_price"])
      if (body[k] !== undefined && (!/^\d{1,5}(?:\.\d{1,2})?$/.test(String(body[k])) || Number(body[k]) < 0.01 || Number(body[k]) > 10000))
        throw Error("RankLens plan prices must be between $0.01 and $10,000 with up to two decimal places.");
    for (const k of ["analytics_plan_day_days","analytics_plan_monthly_days","analytics_plan_yearly_days"])
      if (body[k] !== undefined && (!/^\d{1,4}$/.test(String(body[k])) || Number(body[k]) < 1 || Number(body[k]) > 3660))
        throw Error("Plan durations must be between 1 and 3,660 days.");
    for (const k of ["analytics_plan_day_markup_percent","analytics_plan_monthly_markup_percent","analytics_plan_yearly_markup_percent"])
      if (body[k] !== undefined && (!/^\d{1,3}$/.test(String(body[k])) || Number(body[k]) < 0 || Number(body[k]) > 100))
        throw Error("Placement markup must be a whole percentage from 0 to 100.");
    const db = getDb();
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const [k, v] of Object.entries(body)) {
        if (typeof v !== "string" || v.length > 200)
          throw Error("Invalid setting value");
        db.prepare(
          "INSERT INTO admin_settings(key,value,is_encrypted) VALUES(?,?,0) ON CONFLICT(key) DO UPDATE SET value=excluded.value,is_encrypted=0",
        ).run(k, v);
      }
      audit(user.id, "settings_updated");
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Invalid settings" },
      { status: 400 },
    );
  }
}
