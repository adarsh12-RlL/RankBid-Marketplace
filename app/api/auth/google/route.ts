import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { limited } from "@/lib/auth";
import { GOOGLE_FLOW_COOKIE, GOOGLE_FLOW_TTL_SECONDS, createGoogleOAuthAttempt, safeGoogleReturnTo,
  getGoogleOAuthConfig, requireGoogleOAuthConfig, publicGoogleOAuthError } from "@/lib/google-oauth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
export async function GET(req: NextRequest) {
  try {
    const config = requireGoogleOAuthConfig();
    if (limited(req, "google-oauth-start", 10))
      return NextResponse.json({ error: "Too many sign-in attempts. Try again later." }, { status: 429, headers });
    const attempt = createGoogleOAuthAttempt(getDb(), config, Date.now(), safeGoogleReturnTo(req.nextUrl.searchParams.get("next")));
    const response = NextResponse.redirect(attempt.authorizationUrl, 303);
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    response.cookies.set(GOOGLE_FLOW_COOKIE, attempt.state, { httpOnly: true,
      secure: config.secure, sameSite: "lax", path: "/api/auth/google", maxAge: GOOGLE_FLOW_TTL_SECONDS });
    return response;
  } catch (error) {
    const safe = publicGoogleOAuthError(error);
    if (safe.body?.code === "google_oauth_not_configured" && req.headers.get("accept")?.includes("text/html")) {
      const returnNext = safeGoogleReturnTo(req.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(`/login?notice=google_config_pending&next=${encodeURIComponent(returnNext)}`, req.url), 303);
    }
    return NextResponse.json(safe.body, { status: safe.status, headers });
  }
}
// Legacy posted email/name/role is deliberately never trusted or even read.
export async function POST() {
  if (!getGoogleOAuthConfig()) return NextResponse.json({ configured: false,
    error: "Google sign-in is not configured on this website.", code: "google_oauth_not_configured" }, { status: 503, headers });
  return NextResponse.json({ error: "Use the Google sign-in redirect.", code: "oauth_redirect_required" },
    { status: 405, headers: { ...headers, Allow: "GET" } });
}
