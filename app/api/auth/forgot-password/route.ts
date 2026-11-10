import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { limited, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  if (limited(req, "auth-forgot", 5)) {
    return NextResponse.json({ error: "Too many reset attempts. Please wait a minute." }, { status: 429 });
  }

  try {
    const raw = await req.text();
    const body = JSON.parse(raw);
    const email = String(body.email || "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const isOwner =
      email === (process.env.ADMIN_EMAIL || "adarshgokhe.12@gmail.com").toLowerCase().trim() ||
      email === (process.env.OWNER_EMAIL || "adarshgokhe.12@gmail.com").toLowerCase().trim();

    if (isOwner) {
      return NextResponse.json({
        success: true,
        isOwner: true,
        message: "Owner account recognized. Please sign in directly with your secure credentials or manage access via the Official Admin Operations dashboard.",
      });
    }

    const db = getDb();
    const user = db.prepare("SELECT id, email FROM users WHERE email=?").get(email) as { id: string; email: string } | undefined;

    // Log request into feedback_messages so the owner can review in admin dashboard
    if (user) {
      const now = new Date().toISOString();
      const id = "pwd_reset_" + Date.now();
      try {
        db.prepare(
          "INSERT INTO feedback_messages (id, kind, user_id, display_name, email, subject, body, status, created_at, updated_at) VALUES (?, 'feedback', ?, 'Account User', ?, 'Password Reset Request', 'User requested password reset from the login page.', 'open', ?, ?)"
        ).run(id, user.id, email, now, now);
      } catch {
        // Safe fallback
      }
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists for this email, your password reset request has been logged. You can also contact adarshgokhe.12@gmail.com or click Help below.",
    });
  } catch {
    return NextResponse.json({ error: "Unable to process password reset request." }, { status: 500 });
  }
}
