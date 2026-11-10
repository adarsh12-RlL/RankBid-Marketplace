import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { isTestMode } from "@/lib/ranking";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  if (!isAdmin(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const transactions = getDb()
    .prepare(
      "SELECT pay.id,pay.product_id,pay.amount_cents/100.0 AS amount,pay.provider AS payment_method,pay.status,pay.created_at,pay.is_test,p.name AS product_name,p.domain,p.category FROM payments pay LEFT JOIN products p ON p.id=pay.product_id WHERE pay.verified=1 AND pay.is_test=? ORDER BY pay.created_at DESC LIMIT 100",
    )
    .all(isTestMode() ? 1 : 0);
  return NextResponse.json(
    { transactions },
    { headers: { "Cache-Control": "no-store" } },
  );
}
