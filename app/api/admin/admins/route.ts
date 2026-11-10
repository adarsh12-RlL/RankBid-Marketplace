import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { audit, getUser, hashPassword, isOwner, limited, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const json = (data: unknown, status = 200) => NextResponse.json(data, {
  status,
  headers: { "Cache-Control": "no-store" },
});

async function readBody(req: NextRequest, limit: number) {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > limit) throw new Error("Request too large");
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > limit) throw new Error("Request too large");
  return JSON.parse(raw) as Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  const owner = getUser(req);
  if (!isOwner(owner)) return json({ error: "Owner access is required." }, 403);
  const rows = getDb().prepare(`SELECT u.id,u.email,u.created_at,COALESCE(s.is_active,1) AS is_active
    FROM users u LEFT JOIN admin_account_status s ON s.user_id=u.id
    WHERE u.role='admin' AND lower(u.email)<>? ORDER BY u.created_at DESC`)
    .all(owner!.email.toLowerCase());
  return json({ admins: rows });
}

export async function POST(req: NextRequest) {
  const owner = getUser(req);
  if (!isOwner(owner)) return json({ error: "Owner access is required." }, 403);
  if (!sameOrigin(req)) return json({ error: "Invalid request origin." }, 403);
  if (limited(req, "owner-admins", 15)) return json({ error: "Too many requests. Try again later." }, 429);
  try {
    const input = await readBody(req, 4096);
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = input.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      return json({ error: "Enter a valid email address." }, 400);
    if (email === owner!.email.toLowerCase()) return json({ error: "The owner account cannot be added as a normal admin." }, 400);
    if (typeof password !== "string" || password.length < 12 || password.length > 256)
      return json({ error: "Use a password between 12 and 256 characters." }, 400);

    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.exec("BEGIN IMMEDIATE");
    try {
      if (db.prepare("SELECT 1 FROM users WHERE lower(email)=?").get(email)) {
        db.exec("ROLLBACK");
        return json({ error: "An account already uses this email." }, 409);
      }
      db.prepare("INSERT INTO users(id,email,password_hash,role,created_at) VALUES(?,?,?,?,?)")
        .run(id, email, hashPassword(password), "admin", now);
      audit(owner!.id, "admin_created", id, email);
      db.exec("COMMIT");
    } catch (error) {
      try { db.exec("ROLLBACK"); } catch { /* transaction already closed */ }
      throw error;
    }
    return json({ ok: true, id, email });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Request data is invalid." }, 400);
    if (error instanceof Error && error.message === "Request too large") return json({ error: "Request too large." }, 413);
    return json({ error: "The admin account could not be created." }, 503);
  }
}

export async function PATCH(req: NextRequest) {
  const owner = getUser(req);
  if (!isOwner(owner)) return json({ error: "Owner access is required." }, 403);
  if (!sameOrigin(req)) return json({ error: "Invalid request origin." }, 403);
  if (limited(req, "owner-admins", 15)) return json({ error: "Too many requests. Try again later." }, 429);
  try {
    const input = await readBody(req, 4096);
    const id = typeof input.id === "string" ? input.id : "";
    const action = input.action;
    if (!id || !/^[0-9a-z_-]{3,64}$/i.test(id)) return json({ error: "Admin account not found." }, 400);
    const db = getDb();
    const target = db.prepare("SELECT id,email FROM users WHERE id=? AND role='admin'").get(id) as { id: string; email: string } | undefined;
    if (!target || target.email.toLowerCase() === owner!.email.toLowerCase())
      return json({ error: "Only a normal admin account can be changed here." }, 404);
    if (action === "set-active") {
      if (typeof input.enabled !== "boolean") return json({ error: "Choose whether to enable this account." }, 400);
      const now = new Date().toISOString();
      db.prepare(`INSERT INTO admin_account_status(user_id,is_active,updated_by,updated_at) VALUES(?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET is_active=excluded.is_active,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
        .run(id, input.enabled ? 1 : 0, owner!.id, now);
      if (!input.enabled) db.prepare("DELETE FROM sessions WHERE user_id=?").run(id);
      audit(owner!.id, input.enabled ? "admin_enabled" : "admin_disabled", id, target.email);
      return json({ ok: true });
    }
    if (action === "reset-password") {
      const password = input.password;
      if (typeof password !== "string" || password.length < 12 || password.length > 256)
        return json({ error: "Use a password between 12 and 256 characters." }, 400);
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare("UPDATE users SET password_hash=? WHERE id=? AND role='admin'").run(hashPassword(password), id);
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(id);
        audit(owner!.id, "admin_password_reset", id, target.email);
        db.exec("COMMIT");
      } catch (error) {
        try { db.exec("ROLLBACK"); } catch { /* transaction already closed */ }
        throw error;
      }
      return json({ ok: true });
    }
    return json({ error: "Unsupported admin action." }, 400);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Request data is invalid." }, 400);
    if (error instanceof Error && error.message === "Request too large") return json({ error: "Request too large." }, 413);
    return json({ error: "The admin account could not be updated." }, 503);
  }
}

export async function DELETE(req: NextRequest) {
  const owner = getUser(req);
  if (!isOwner(owner)) return json({ error: "Owner access is required." }, 403);
  if (!sameOrigin(req)) return json({ error: "Invalid request origin." }, 403);
  if (limited(req, "owner-admins", 10)) return json({ error: "Too many requests. Try again later." }, 429);
  try {
    const input = await readBody(req, 2048);
    const id = typeof input.id === "string" ? input.id : "";
    if (!id || !/^[0-9a-z_-]{3,64}$/i.test(id)) return json({ error: "Admin account not found." }, 400);
    const db = getDb();
    const target = db.prepare("SELECT id,email FROM users WHERE id=? AND role='admin'").get(id) as { id: string; email: string } | undefined;
    if (!target || target.email.toLowerCase() === owner!.email.toLowerCase())
      return json({ error: "The owner account cannot be deleted." }, 403);
    db.exec("BEGIN IMMEDIATE");
    try {
      const tableExists = (name: string) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
      const ownsProducts = !!db.prepare("SELECT 1 FROM products WHERE owner_id=? LIMIT 1").get(id);
      const hasPayments = !!db.prepare("SELECT 1 FROM payments WHERE user_id=? LIMIT 1").get(id);
      const ownsSites = tableExists("analytics_sites") && !!db.prepare("SELECT 1 FROM analytics_sites WHERE owner_id=? LIMIT 1").get(id);
      const linkedGoogle = tableExists("google_oauth_accounts") && !!db.prepare("SELECT 1 FROM google_oauth_accounts WHERE user_id=? LIMIT 1").get(id);
      if (ownsProducts || hasPayments || ownsSites || linkedGoogle) {
        db.exec("ROLLBACK");
        return json({ error: "This admin owns account data. Disable the account instead so its records remain intact." }, 409);
      }
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(id);
      db.prepare("DELETE FROM users WHERE id=? AND role='admin'").run(id);
      audit(owner!.id, "admin_deleted", id, target.email);
      db.exec("COMMIT");
    } catch (error) {
      try { db.exec("ROLLBACK"); } catch { /* transaction already closed */ }
      throw error;
    }
    return json({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Request data is invalid." }, 400);
    if (error instanceof Error && error.message === "Request too large") return json({ error: "Request too large." }, 413);
    return json({ error: "The admin account could not be deleted." }, 503);
  }
}
