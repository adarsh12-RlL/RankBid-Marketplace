import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { limited, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const response = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

function findInvite(token: string) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  return (
    (getDb()
      .prepare(
        "SELECT id,name,domain,website_url,logo_url,status,invite_expires_at FROM partner_companies WHERE invite_token_hash=?"
      )
      .get(tokenHash(token)) as
      | {
          id: string;
          name: string;
          domain: string;
          website_url: string;
          logo_url: string;
          status: string;
          invite_expires_at: string | null;
        }
      | undefined) || null
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Requested-With, Origin",
    },
  });
}

export async function GET(req: NextRequest) {
  if (limited(req, "company-consent-read", 30))
    return response({ error: "Please wait a moment before trying again." }, 429);
  const token = req.nextUrl.searchParams.get("token") || "";
  const invite = findInvite(token);
  if (
    !invite ||
    invite.status !== "pending" ||
    !invite.invite_expires_at ||
    Date.parse(invite.invite_expires_at) <= Date.now()
  )
    return response({ error: "This invitation is invalid, expired, or already used." }, 404);
  return response({
    company: {
      name: invite.name,
      domain: invite.domain,
      websiteUrl: invite.website_url,
      logoAvailable: Boolean(invite.logo_url),
    },
    expiresAt: invite.invite_expires_at,
  });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return response({ error: "Invalid request origin." }, 403);
  if (limited(req, "company-consent-submit", 8))
    return response({ error: "Too many responses. Try again later." }, 429);
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 4096)
      return response({ error: "The request is too large." }, 413);
    const input = JSON.parse(raw) as Record<string, unknown>;
    const token = typeof input.token === "string" ? input.token : "";
    const action = input.action;
    if (!token || !["approve", "decline"].includes(String(action)))
      return response({ error: "Choose approve or decline." }, 400);
    const db = getDb();
    db.exec("BEGIN IMMEDIATE");
    try {
      const invite = findInvite(token);
      if (
        !invite ||
        invite.status !== "pending" ||
        !invite.invite_expires_at ||
        Date.parse(invite.invite_expires_at) <= Date.now()
      ) {
        db.exec("ROLLBACK");
        return response({ error: "This invitation is invalid, expired, or already used." }, 404);
      }
      const now = new Date().toISOString();
      const approved = action === "approve";
      const logoConsent = approved && input.logoConsent === true && Boolean(invite.logo_url);
      const scope = logoConsent
        ? "RankBid company directory listing including supplied logo"
        : "RankBid company name and website link only";
      const result = db
        .prepare(
          "UPDATE partner_companies SET status=?,approved_at=?,consent_at=?,consent_scope=?,invite_token_hash='',invite_expires_at=NULL,updated_at=? WHERE id=? AND status='pending'"
        )
        .run(
          approved ? "approved" : "declined",
          approved ? now : null,
          approved ? now : null,
          approved ? scope : "RankBid company directory listing declined",
          now,
          invite.id
        );
      if (!result.changes) {
        db.exec("ROLLBACK");
        return response({ error: "This invitation has already been used." }, 409);
      }
      db.prepare(
        "INSERT INTO audit_logs(actor_id,action,target_id,created_at,actor_email,target_label) VALUES(NULL,?,?,?,'',?)"
      ).run(
        approved ? "company_consent_approved" : "company_consent_declined",
        invite.id,
        now,
        invite.name.slice(0, 254)
      );
      db.exec("COMMIT");
      return response({
        ok: true,
        status: approved ? "approved" : "declined",
        logoIncluded: logoConsent,
      });
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch {
        /* transaction already closed */
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof SyntaxError)
      return response({ error: "The request data is invalid." }, 400);
    return response({ error: "Your response could not be saved. Please try again." }, 503);
  }
}
