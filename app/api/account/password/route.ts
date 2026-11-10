import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { audit, getUser, hashPassword, limited, sameOrigin, verifyPassword, setSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to change your password." }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (limited(req, "password-change", 5)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  try {
    if (Number(req.headers.get("content-length") || 0) > 4096)
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 4096)
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (typeof body.currentPassword !== "string" || body.currentPassword.length > 256 ||
        typeof body.newPassword !== "string" || body.newPassword.length < 12 || body.newPassword.length > 256)
      return NextResponse.json({ error: "Enter your current password and a new password of 12 to 256 characters." }, { status: 400 });
    const db = getDb();
    const account = db.prepare("SELECT password_hash FROM users WHERE id=?").get(user.id) as { password_hash: string } | undefined;
    if (!account || !verifyPassword(body.currentPassword, account.password_hash))
      return NextResponse.json({ error: "The current password is incorrect, or this account uses Google sign-in." }, { status: 401 });
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(hashPassword(body.newPassword), user.id);
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
      audit(user.id, "password_changed");
      db.exec("COMMIT");
    } catch (error) {
      try { db.exec("ROLLBACK"); } catch { /* transaction already closed */ }
      throw error;
    }
    const response = NextResponse.json({ success: true });
    setSession(response, user.id);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Request data is invalid." }, { status: 400 });
    return NextResponse.json({ error: "The password could not be changed." }, { status: 503 });
  }
}
