import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const u = getUser(req);
  if (!u)
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("payment_id");
  const p = getDb()
    .prepare(
      "SELECT pay.*,p.name AS listingTitle,p.domain AS listingDomain,p.is_approved FROM payments pay JOIN products p ON p.id=pay.product_id WHERE pay.id=?",
    )
    .get(Number(id)) as any;
  if (!p || (p.user_id !== u.id && u.role !== "admin"))
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json(
    {
      id: String(p.id),
      productId: p.product_id,
      listingTitle: p.listingTitle,
      listingDomain: p.listingDomain,
      amountUsd: p.amount_cents / 100,
      targetBoard: p.target_board,
      status: p.status,
      verified: !!p.verified,
      isTest: !!p.is_test,
      approved: !!p.is_approved,
      provider: p.provider,
      presentmentCurrency: p.presentment_currency,
      presentmentAmount: p.presentment_amount,
      receivedAt: p.confirmed_at,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
