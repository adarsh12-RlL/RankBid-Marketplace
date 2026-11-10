import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { audit, getUser, isOwner, limited, sameOrigin } from "@/lib/auth";
import { parseCompanyInput } from "@/lib/company-directory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const inviteUrl = (origin: string, token: string) => `${origin}/companies/consent?token=${encodeURIComponent(token)}`;

function owner(req: NextRequest) {
  const user = getUser(req);
  return user && isOwner(user) ? user : null;
}

export async function GET(req: NextRequest) {
  const user = owner(req);
  if (!user) return response({ error: "Owner access is required." }, 401);
  const rows = getDb().prepare("SELECT id,name,domain,website_url,logo_url,contact_email,size_tier,status,invite_expires_at,approved_at,consent_at,consent_scope,created_at,updated_at FROM partner_companies ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'hidden' THEN 2 ELSE 3 END,size_tier DESC,name COLLATE NOCASE LIMIT 500").all();
  return response({ items: rows });
}

export async function POST(req: NextRequest) {
  const user = owner(req);
  if (!user) return response({ error: "Owner access is required." }, 401);
  if (!sameOrigin(req)) return response({ error: "Invalid request origin." }, 403);
  if (limited(req, "owner-company-create", 20)) return response({ error: "Too many requests. Try again shortly." }, 429);
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 12000) return response({ error: "The request is too large." }, 413);
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 12000) return response({ error: "The request is too large." }, 413);
    const input = JSON.parse(raw) as Record<string, unknown>;
    const db = getDb();
    const now = new Date().toISOString();
    const token = randomBytes(32).toString("base64url");
    const tokenExpiry = new Date(Date.now() + 30 * 86400000).toISOString();

    if (input.action === "reinvite") {
      const id = typeof input.id === "string" && input.id.length <= 80 ? input.id : "";
      if (!id) return response({ error: "Company not found." }, 400);
      const existing = db.prepare("SELECT id,name,status FROM partner_companies WHERE id=?").get(id) as { id: string; name: string; status: string } | undefined;
      if (!existing || !["pending", "declined"].includes(existing.status)) return response({ error: "Only pending or declined invitations can be renewed." }, 409);
      db.prepare("UPDATE partner_companies SET status='pending',invite_token_hash=?,invite_expires_at=?,updated_at=? WHERE id=?").run(tokenHash(token), tokenExpiry, now, id);
      audit(user.id, "company_invitation_renewed", id, existing.name);
      return response({ ok: true, consentUrl: inviteUrl(req.nextUrl.origin, token) });
    }

    const company = parseCompanyInput(input);
    const duplicate = db.prepare("SELECT name FROM partner_companies WHERE lower(domain)=lower(?) OR lower(trim(name))=lower(trim(?)) LIMIT 1").get(company.domain, company.name);
    if (duplicate) return response({ error: "This company name or website is already in the directory workflow." }, 409);
    const id = randomUUID();
    db.prepare("INSERT INTO partner_companies(id,name,domain,website_url,logo_url,contact_email,size_tier,status,invite_token_hash,invite_expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'pending',?,?,?,?)").run(id, company.name, company.domain, company.websiteUrl, company.logoUrl, company.contactEmail, company.sizeTier, tokenHash(token), tokenExpiry, now, now);
    audit(user.id, "company_invitation_created", id, company.name);
    return response({ ok: true, id, consentUrl: inviteUrl(req.nextUrl.origin, token) }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return response({ error: "The request data is invalid." }, 400);
    if (error instanceof Error && /must be|Enter |Choose |characters|address is too long/i.test(error.message)) return response({ error: error.message }, 400);
    return response({ error: "The company invitation could not be saved." }, 503);
  }
}

export async function PATCH(req: NextRequest) {
  const user = owner(req);
  if (!user) return response({ error: "Owner access is required." }, 401);
  if (!sameOrigin(req)) return response({ error: "Invalid request origin." }, 403);
  if (limited(req, "owner-company-status", 30)) return response({ error: "Too many requests. Try again shortly." }, 429);
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 4096) return response({ error: "The request is too large." }, 413);
    const input = JSON.parse(raw) as Record<string, unknown>;
    const id = typeof input.id === "string" && input.id.length <= 80 ? input.id : "";
    const action = input.action;
    if (!id || !["hide", "show"].includes(String(action))) return response({ error: "Choose a valid company visibility action." }, 400);
    const db = getDb();
    const row = db.prepare("SELECT name,status,consent_at FROM partner_companies WHERE id=?").get(id) as { name: string; status: string; consent_at: string | null } | undefined;
    if (!row) return response({ error: "Company not found." }, 404);
    if (action === "hide" && !["approved", "hidden"].includes(row.status)) return response({ error: "Only an approved company can be hidden." }, 409);
    if (action === "show" && (row.status !== "hidden" || !row.consent_at)) return response({ error: "Only a previously approved company can be shown." }, 409);
    const status = action === "hide" ? "hidden" : "approved";
    db.prepare("UPDATE partner_companies SET status=?,updated_at=? WHERE id=?").run(status, new Date().toISOString(), id);
    audit(user.id, action === "hide" ? "company_listing_hidden" : "company_listing_shown", id, row.name);
    return response({ ok: true, status });
  } catch (error) {
    if (error instanceof SyntaxError) return response({ error: "The request data is invalid." }, 400);
    return response({ error: "The company visibility could not be changed." }, 503);
  }
}
