import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { audit, limited, setSession } from "@/lib/auth";
import { GOOGLE_FLOW_COOKIE, GoogleOAuthError, completeGoogleOAuth,
  consumeGoogleOAuthAttempt, findOrCreateGoogleUser, getGoogleOAuthConfig,
  publicGoogleOAuthError, requireGoogleOAuthConfig } from "@/lib/google-oauth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
export async function GET(req: NextRequest) {
  let response: NextResponse;
  try {
    const config = requireGoogleOAuthConfig();
    if (limited(req, "google-oauth-callback", 20)) throw new GoogleOAuthError("google_unavailable", 429);
    const params = req.nextUrl.searchParams;
    if (params.getAll("state").length !== 1 || params.getAll("code").length > 1 || params.getAll("error").length > 1)
      throw new GoogleOAuthError("invalid_oauth_state");
    const db = getDb();
    const flow = consumeGoogleOAuthAttempt(db, params.get("state"), req.cookies.get(GOOGLE_FLOW_COOKIE)?.value);
    if (params.has("error")) throw new GoogleOAuthError("google_consent_denied");
    const code = params.get("code");
    if (!code) throw new GoogleOAuthError("invalid_google_identity");
    const identity = await completeGoogleOAuth({ config, flow, code });
    const user = findOrCreateGoogleUser(db, identity);
    audit(user.id, "google_signin", identity.sub);
    response = NextResponse.redirect(new URL(flow.returnTo, config.appOrigin), 303);
    setSession(response, user.id);
  } catch (error) {
    const safe = publicGoogleOAuthError(error);
    response = NextResponse.json(safe.body, { status: safe.status });
  }
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  response.cookies.set(GOOGLE_FLOW_COOKIE, "", { httpOnly: true,
    secure: getGoogleOAuthConfig()?.secure ?? true, sameSite: "lax", path: "/api/auth/google", maxAge: 0 });
  return response;
}
