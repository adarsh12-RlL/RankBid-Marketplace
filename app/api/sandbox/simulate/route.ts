import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getUser, sameOrigin } from "@/lib/auth";
import { getPaymentMode } from "@/lib/ranking";
export async function POST(req: NextRequest) {
  if (getPaymentMode() !== "sandbox")
    return NextResponse.json({ error: "Sandbox is disabled" }, { status: 403 });
  const u = getUser(req);
  if (!u)
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const b = await req.json();
    if (!["succeed", "fail"].includes(b.action)) throw Error("Invalid action");
    const db = getDb();
    db.exec("BEGIN IMMEDIATE");
    try {
      const p = db
        .prepare("SELECT * FROM payments WHERE id=?")
        .get(Number(b.paymentId)) as any;
      if (
        !p ||
        p.provider !== "sandbox" ||
        p.is_test !== 1 ||
        (p.user_id !== u.id && u.role !== "admin")
      )
        throw Error("Sandbox payment not found");
      if (p.status === "completed" && b.action === "succeed") {
        if(b.action==="succeed")db.prepare("UPDATE products SET is_approved=1,review_state='published' WHERE id=? AND review_state='awaiting_payment' AND is_active=1").run(p.product_id);
      db.exec("COMMIT");
        return NextResponse.json({ success: true });
      }
      if (
        p.status !== "pending" ||
        p.checkout_expires_at < new Date().toISOString()
      )
        throw Error("This checkout is no longer pending");
      db.prepare(
        "UPDATE payments SET status=?,verified=?,confirmed_at=? WHERE id=?",
      ).run(
        b.action === "succeed" ? "completed" : "failed",
        b.action === "succeed" ? 1 : 0,
        b.action === "succeed" ? new Date().toISOString() : null,
        p.id,
      );
      if(b.action==="succeed")db.prepare("UPDATE products SET is_approved=1,review_state='published' WHERE id=? AND review_state='awaiting_payment' AND is_active=1").run(p.product_id);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Invalid simulation" },
      { status: 400 },
    );
  }
}
