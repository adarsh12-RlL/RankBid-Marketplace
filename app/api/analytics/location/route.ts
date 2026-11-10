import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import getDb from "@/lib/db";
import { limited, sameOrigin } from "@/lib/auth";
import { approximateLocationStatus, shareApproximateLocation, withdrawApproximateLocation } from "@/lib/analytics-location";

export const dynamic = "force-dynamic";
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

function visitor(req: NextRequest) {
  const cookie = req.cookies.get("rankbid_visitor")?.value;
  return cookie && /^[a-f0-9]{32}$/.test(cookie) ? cookie : null;
}

export async function GET(req: NextRequest) {
  // Cross-origin reads are blocked even though this response contains no location.
  const origin = req.headers.get("origin");
  if ((origin && !sameOrigin(req)) || req.headers.get("sec-fetch-site") === "cross-site") return response({ error: "Invalid origin." }, 403);
  const identity = visitor(req);
  if (!identity) return response({ shared: false });
  try { return response(approximateLocationStatus(identity, new Date(), getDb())); }
  catch { return response({ error: "Location sharing is temporarily unavailable." }, 503); }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return response({ error: "Invalid origin." }, 403);
  if (limited(req, "location-share", 12)) return response({ error: "Too many requests. Wait and try again." }, 429);
  const identity = visitor(req);
  if (!identity) return response({ error: "Missing visitor identity." }, 401);
  try {
    if (Number(req.headers.get("content-length") || 0) > 1024) return response({ error: "Request is too large." }, 413);
    const body = await req.text();
    if (Buffer.byteLength(body, "utf8") > 1024) return response({ error: "Request is too large." }, 413);
    const result = shareApproximateLocation(identity, JSON.parse(body), new Date(), getDb());
    return response({ ok: true, precisionDegrees: result.precisionDegrees, expiresAt: result.expiresAt });
  } catch (error) {
    if (error instanceof RangeError) return response({ error: error.message }, 400);
    if (error instanceof SyntaxError) return response({ error: "Invalid location sharing request." }, 400);
    return response({ error: "Location sharing is temporarily unavailable." }, 503);
  }
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return response({ error: "Invalid origin." }, 403);
  if (limited(req, "location-withdraw", 60)) return response({ error: "Too many requests. Wait and try again." }, 429);
  const identity = visitor(req);
  if (!identity) return response({ ok: true });
  try { withdrawApproximateLocation(identity, new Date(), getDb()); return response({ ok: true }); }
  catch { return response({ error: "Could not withdraw location sharing. Try again." }, 503); }
}
