import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import getDb from "@/lib/db";
import { limited, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  if (limited(req, "auth-otp", 10)) {
    return NextResponse.json({ error: "Too many OTP attempts. Please wait a minute." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const action = String(body.action || "send").toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const db = getDb();

    if (action === "send") {
      // Check if user already exists
      const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email);
      if (existing) {
        return NextResponse.json(
          { error: "An account already exists with this email. Please sign in instead." },
          { status: 409 }
        );
      }

      // Generate 6-digit cryptographic-quality OTP
      const otp = crypto.randomInt(100000, 1000000).toString();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minutes

      db.prepare(`
        INSERT INTO email_otps (email, otp_code, expires_at, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          otp_code = excluded.otp_code,
          expires_at = excluded.expires_at,
          created_at = excluded.created_at;
      `).run(email, otp, expiresAt, now.toISOString());

      // Dispatch real email via Resend API if configured
      const resendApiKey = process.env.RESEND_API_KEY?.trim();
      let sentViaEmail = false;
      let resendNotice = "";
      if (resendApiKey) {
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM || "RankBid Auth <onboarding@resend.dev>",
              to: email,
              subject: `${otp} is your RankBid verification code`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                  <h2 style="color: #0f172a; margin-top: 0;">RankBid Verification</h2>
                  <p style="color: #475569; font-size: 14px;">Use the 6-digit code below to complete your account registration:</p>
                  <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0284c7; font-family: monospace;">${otp}</span>
                  </div>
                  <p style="color: #64748b; font-size: 12px;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
                </div>
              `,
            }),
          });
          if (emailRes.ok) {
            sentViaEmail = true;
          } else {
            const errBody = await emailRes.json().catch(() => ({}));
            console.warn("[Resend API Error]:", emailRes.status, errBody);
            if (errBody?.message) {
              resendNotice = errBody.message;
            }
          }
        } catch (emailErr) {
          console.warn("[Email Dispatch Warning]:", emailErr);
        }
      }

      if (sentViaEmail) {
        return NextResponse.json({
          success: true,
          deliveredToEmail: true,
          message: `Verification code sent to ${email}. Please check your inbox (and spam folder).`,
        });
      }

      const isDev = process.env.NODE_ENV !== "production" || process.env.ENABLE_DEV_OTP === "true";
      if (isDev) {
        return NextResponse.json({
          success: true,
          deliveredToEmail: false,
          devCode: otp,
          message: `Verification code: ${otp} ${resendNotice ? `(Test mode: code is ${otp}).` : ""}`,
        });
      }

      return NextResponse.json({
        success: false,
        error: "Verification email could not be delivered to this address. Please try again later.",
      }, { status: 503 });
    }

    if (action === "verify") {
      const inputOtp = String(body.otp || "").trim();
      if (!inputOtp || inputOtp.length !== 6) {
        return NextResponse.json({ error: "Enter the complete 6-digit code." }, { status: 400 });
      }

      const row = db.prepare("SELECT otp_code, expires_at FROM email_otps WHERE email=?").get(email) as
        | { otp_code: string; expires_at: string }
        | undefined;

      if (!row || row.otp_code !== inputOtp) {
        return NextResponse.json({ error: "Incorrect verification code. Please check and try again." }, { status: 400 });
      }

      if (new Date(row.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ error: "Verification code has expired. Request a new one." }, { status: 400 });
      }

      return NextResponse.json({ success: true, verified: true });
    }

    return NextResponse.json({ error: "Invalid OTP action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: "Unable to process verification code." }, { status: 500 });
  }
}
