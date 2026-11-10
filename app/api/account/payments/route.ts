import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isTestMode } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const u = getUser(req);
  if (!u) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  // Customer records and payment history must be strictly isolated by authenticated account.
  const rows = getDb()
    .prepare(
      `SELECT pay.id, pay.product_id, p.name AS productName, pay.amount_cents, pay.refunded_cents,
              pay.status, pay.verified, pay.is_test, pay.presentment_currency, pay.presentment_amount,
              pay.confirmed_at, pay.created_at
       FROM payments pay
       JOIN products p ON p.id = pay.product_id
       WHERE pay.is_test = ? AND pay.user_id = ?
       ORDER BY pay.id DESC
       LIMIT 50`
    )
    .all(isTestMode() ? 1 : 0, u.id);

  return NextResponse.json(
    { userId: u.id, payments: rows },
    { headers: { "Cache-Control": "no-store" } }
  );
}
