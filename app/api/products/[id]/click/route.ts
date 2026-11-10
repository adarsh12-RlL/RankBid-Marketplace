import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { sameOrigin, limited } from "@/lib/auth";
import { getProducts } from "@/lib/ranking";
export const dynamic = "force-dynamic";
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (limited(req, "click", 60))
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const { id } = await params;
  const p = getProducts({ limit: 10000 }).products.find(
    (p) => String(p.id) === id,
  );
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = getDb();
  const hash =
    "v2:" +
    crypto
      .createHash("sha256")
      .update(
        new Date().toISOString().slice(0, 10) +
          (req.headers.get("x-forwarded-for")?.split(",")[0] || "local") +
          (req.headers.get("user-agent") || ""),
      )
      .digest("hex");
  if (
    !db
      .prepare(
        "SELECT id FROM clicks WHERE product_id=? AND ip_address=? AND created_at>datetime('now','-30 seconds')",
      )
      .get(id, hash)
  )
    db.prepare(
      "INSERT INTO clicks(product_id,ip_address,user_agent) VALUES(?,?,?)",
    ).run(id, hash, "");
  const count = Number(
    (
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM clicks WHERE product_id=? AND ip_address LIKE 'v2:%'",
        )
        .get(id) as any
    ).n,
  );
  return NextResponse.json({ success: true, count });
}
