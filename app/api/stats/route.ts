import { NextResponse } from "next/server";
import { stats } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(stats(), {
    headers: { "Cache-Control": "no-store" },
  });
}
