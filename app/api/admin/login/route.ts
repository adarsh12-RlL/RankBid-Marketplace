import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import {
  sameOrigin,
  limited,
  verifyPassword,
  setSession,
  audit,
  isAccountActive,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (limited(req, "admin-login", 8))
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  try {
    if (Number(req.headers.get("content-length") || 0) > 8192)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 8192)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const b = JSON.parse(raw);
    const email = String(b.email || b.username || "")
      .toLowerCase()
      .trim();
    const u = getDb()
      .prepare("SELECT * FROM users WHERE email=? AND role='admin'")
      .get(email) as any;
    if (
      typeof b.password !== "string" ||
      b.password.length > 256 ||
      !u ||
      !isAccountActive(u.id) ||
      !verifyPassword(b.password, u.password_hash)
    )
      return NextResponse.json(
        {
          error:
            "Invalid credentials. Use npm run setup:admin to configure a local administrator.",
        },
        { status: 401 },
      );
    const res = NextResponse.json({ success: true });
    setSession(res, u.id);
    audit(u.id, "admin_login");
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
