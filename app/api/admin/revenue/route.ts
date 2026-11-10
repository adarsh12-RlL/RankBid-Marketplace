import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { stats } from "@/lib/ranking";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  if (!isAdmin(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(stats(), {
    headers: { "Cache-Control": "no-store" },
  });
}
