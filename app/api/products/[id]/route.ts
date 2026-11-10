import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getUser, sameOrigin, audit } from "@/lib/auth";
import {
  getProducts,
  publicProduct,
  totalCents,
  isTestMode,
} from "@/lib/ranking";
import { CATEGORIES } from "@/lib/utils";
export const dynamic = "force-dynamic";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();
  const p = db.prepare("SELECT * FROM products WHERE id=?").get(id) as any;
  const u = getUser(req);
  if (
    !p ||
    ((!p.is_active ||
      !p.is_approved ||
      !getProducts({ limit: 10000 }).products.some((x) => x.id === p.id)) &&
      u?.id !== p.owner_id &&
      u?.role !== "admin")
  )
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const payments = db
    .prepare(
      "SELECT amount_cents/100.0 AS amount,status,confirmed_at AS created_at,provider AS payment_method FROM payments WHERE product_id=? AND verified=1 AND is_test=? ORDER BY confirmed_at DESC LIMIT 100",
    )
    .all(id, isTestMode() ? 1 : 0);
  return NextResponse.json({
    product: publicProduct({ ...p, amount_paid: totalCents(p.id) / 100 }),
    payments,
    history: [],
  });
}
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const u = getUser(req);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const { id } = await params;
  const db = getDb();
  const p = db.prepare("SELECT * FROM products WHERE id=?").get(id) as any;
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (u.role !== "admin" && p.owner_id !== u.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const b = await req.json();
    const allowed =
      u.role === "admin"
        ? [
            "name",
            "description",
            "category",
            "is_active",
            "is_approved",
            "is_featured",
          ]
        : ["name", "description", "category"];
    if (Object.keys(b).some((k) => !allowed.includes(k)))
      throw Error("Unsupported field; payment totals cannot be edited");
    if (
      b.name !== undefined &&
      (typeof b.name !== "string" || !b.name.trim() || b.name.length > 100)
    )
      throw Error("Invalid name");
    if (
      b.description !== undefined &&
      (typeof b.description !== "string" || b.description.length > 500)
    )
      throw Error("Invalid description");
    if (
      b.category !== undefined &&
      (!CATEGORIES.includes(b.category) || b.category === "All")
    )
      throw Error("Invalid category");
    for (const k of ["is_active", "is_approved", "is_featured"])
      if (b[k] !== undefined && ![0, 1].includes(b[k]))
        throw Error("Invalid moderation value");
    for (const [k, v] of Object.entries(b))
      db.prepare(
        `UPDATE products SET ${k}=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      ).run(v as any, id);
    if(u.role==="admin"&&(b.is_approved!==undefined||b.is_active!==undefined))db.prepare("UPDATE products SET review_state='moderated' WHERE id=?").run(id);
    audit(u.id, "product_updated", id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Invalid request" },
      { status: 400 },
    );
  }
}
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return PATCH(
    new NextRequest(req.url, {
      method: "PATCH",
      headers: req.headers,
      body: JSON.stringify({ is_active: 0 }),
    }),
    ctx,
  );
}
