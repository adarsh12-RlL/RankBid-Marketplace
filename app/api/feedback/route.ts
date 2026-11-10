import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getUser, limited, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const response = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const ticketDigest = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("ticket") || "";
  if (token) {
    if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return response({ error: "The ticket link is invalid." }, 400);
    const origin = req.headers.get("origin");
    if ((origin && !sameOrigin(req)) || req.headers.get("sec-fetch-site") === "cross-site") return response({ error: "Invalid origin." }, 403);
    const item = getDb().prepare("SELECT body,status,created_at,admin_reply,replied_at FROM feedback_messages WHERE kind='feedback' AND reply_token_hash=?").get(ticketDigest(token)) as { body: string; status: string; created_at: string; admin_reply: string; replied_at: string | null } | undefined;
    if (!item) return response({ error: "This private reply link is invalid or has expired." }, 404);
    return response({ ticket: { body: item.body, status: item.status, createdAt: item.created_at, reply: item.admin_reply || null, repliedAt: item.replied_at } });
  }

  // Only customer reviews are public. Private feedback never leaves the admin inbox.
  const items = getDb().prepare("SELECT id,display_name,body,rating,created_at FROM feedback_messages WHERE kind='review' AND status='published' AND user_id IS NOT NULL ORDER BY created_at DESC LIMIT 100").all();
  return response({ items });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return response({ error: "Invalid origin." }, 403);
  if (limited(req, "feedback-submit", 8, 60_000)) return response({ error: "Too many submissions. Please try again in a minute." }, 429);
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 8192) return response({ error: "The message is too long." }, 413);
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 8192) return response({ error: "The message is too long." }, 413);
    const input = JSON.parse(raw) as Record<string, unknown>;
    const kind = input.kind;
    if (kind !== "feedback" && kind !== "review") return response({ error: "Choose feedback or review." }, 400);
    const user = getUser(req);
    if (kind === "review" && !user) return response({ error: "Please sign in before submitting a review. Your account email will be attached automatically." }, 401);
    const name = kind === "review" ? "Verified customer" : typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
    // Review identity comes from the authenticated session, never from submitted form data.
    const email = kind === "review" ? user!.email : typeof input.email === "string" ? input.email.trim().toLowerCase().slice(0, 254) : "";
    const subject = kind === "review" ? "" : typeof input.subject === "string" ? input.subject.trim().slice(0, 120) : "";
    const body = typeof input.body === "string" ? input.body.trim() : "";
    const rating = input.rating;
    const publicAllowed = 0;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response({ error: "Enter a valid email address." }, 400);
    if (body.length < 8 || body.length > 2000) return response({ error: "The message must be 8 to 2,000 characters long." }, 400);
    if (kind === "review" && (!Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 5)) return response({ error: "Choose a rating from 1 to 5 stars." }, 400);

    const id = crypto.randomUUID();
    const token = kind === "feedback" ? crypto.randomBytes(32).toString("base64url") : "";
    const now = new Date().toISOString();
    getDb().prepare("INSERT INTO feedback_messages(id,kind,user_id,display_name,email,subject,body,rating,status,public_allowed,public_status,reply_token_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
      id, kind, user?.id || null, name || "Anonymous", email, subject, body,
      kind === "review" ? Number(rating) : null,
      kind === "review" ? "pending" : "open",
      publicAllowed, "hidden", token ? ticketDigest(token) : "", now, now,
    );
    return response(kind === "feedback"
      ? { ok: true, ticketToken: token, message: "Your feedback was sent to the admin. Save your private reply link." }
      : { ok: true, message: "Your review has been submitted for administrator moderation before being published." }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return response({ error: "The form data could not be read. Please try again." }, 400);
    return response({ error: "Feedback could not be saved. Please try again later." }, 503);
  }
}
