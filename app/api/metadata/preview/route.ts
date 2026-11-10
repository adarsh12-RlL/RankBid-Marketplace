import { NextRequest, NextResponse } from "next/server";
import { fetchMetadataSafely } from "@/lib/metadata";
import { limited } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  if (limited(req, "metadata", 10))
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  try {
    return NextResponse.json(
      await fetchMetadataSafely(new URL(req.url).searchParams.get("url") || ""),
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Metadata unavailable" },
      { status: 422 },
    );
  }
}
