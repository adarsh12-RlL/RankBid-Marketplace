import { NextRequest, NextResponse } from "next/server";
import { getProducts, publicProduct } from "@/lib/ranking";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const s = new URL(req.url).searchParams;
  const limit = Number(s.get("limit") || 50),
    offset = Number(s.get("offset") || 0);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(offset) ||
    offset < 0
  )
    return NextResponse.json({ error: "Invalid pagination" }, { status: 400 });
  const r = getProducts({
    board:
      s.get("view") === "today" || s.get("board") === "today"
        ? "today"
        : "all_time",
    category: s.get("category") || undefined,
    search: s.get("search")?.slice(0, 200),
    limit,
    offset,
  });
  return NextResponse.json({ ...r, products: r.products.map(publicProduct) });
}
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Create a verified checkout through /api/checkout/session. Submitting an amount does not credit a rank.",
    },
    { status: 405 },
  );
}
