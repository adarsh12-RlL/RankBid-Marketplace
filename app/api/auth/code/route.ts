import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
function disabled() {
  return NextResponse.json({ configured: false, code: "email_code_unavailable",
    error: "Email-code sign-in is unavailable until secure email delivery is configured." },
    { status: 503, headers: { "Cache-Control": "no-store" } });
}
// Compatibility endpoint: never issues, logs, returns, accepts or verifies an OTP.
export async function GET() { return disabled(); }
export async function POST() { return disabled(); }
