import { NextRequest, NextResponse } from "next/server";
import { getUser, sameOrigin } from "@/lib/auth";
import { recordMemberPresence } from "@/lib/member-presence";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || !sameOrigin(req)) return NextResponse.json({ error: "Same-origin request required" }, { status: 403 });
  const user = getUser(req);
  if (user) recordMemberPresence(user.id);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
