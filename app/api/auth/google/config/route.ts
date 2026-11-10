import { NextResponse } from "next/server";
import { getGoogleOAuthConfig } from "@/lib/google-oauth";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ provider: "google", configured: Boolean(getGoogleOAuthConfig()),
    startUrl: "/api/auth/google", emailCodeConfigured: false }, { headers: { "Cache-Control": "no-store" } });
}
