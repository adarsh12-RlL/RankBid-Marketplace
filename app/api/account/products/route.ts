import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isTestMode, totalCents } from "@/lib/ranking";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const u = getUser(req);
  if (!u)
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const products = (
    getDb()
      .prepare(
        "SELECT id,name,domain,is_approved,is_active FROM products WHERE owner_id=? AND is_demo=? ORDER BY id DESC",
      )
      .all(u.id, isTestMode() ? 1 : 0) as any[]
  ).map((p) => ({
    ...p,
    allTimeCents: totalCents(p.id),
    todayCents: totalCents(p.id, "today"),
  }));
  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "no-store" } },
  );
}
