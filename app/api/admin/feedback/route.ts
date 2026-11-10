import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { audit, getUser, isAdmin, limited, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const response = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return response({ error: "Administrator access is required." }, 401);
  const items = getDb().prepare("SELECT id,kind,user_id,display_name,email,subject,body,rating,status,public_allowed,public_status,admin_reply,created_at,updated_at,replied_at FROM feedback_messages ORDER BY CASE WHEN kind='feedback' AND status='open' THEN 0 WHEN kind='review' AND status='pending' THEN 1 ELSE 2 END,created_at DESC LIMIT 250").all();
  return response({ items });
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (user?.role !== "admin") return response({ error: "Administrator access is required." }, 401);
  if (!sameOrigin(req)) return response({ error: "Invalid request origin." }, 403);
  if (limited(req, "admin-feedback", 60)) return response({ error: "Too many requests. Please try again later." }, 429);
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 8192) return response({ error: "The request is too large." }, 413);
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 8192) return response({ error: "The request is too large." }, 413);
    const input = JSON.parse(raw) as Record<string, unknown>;
    const id = typeof input.id === "string" && input.id.length <= 80 ? input.id : "";
    const action = input.action;
    if (!id) return response({ error: "Message not found." }, 400);
    const db = getDb();
    const item = db.prepare("SELECT id,kind,status,public_allowed FROM feedback_messages WHERE id=?").get(id) as { id: string; kind: string; status: string; public_allowed: number } | undefined;
    if (!item) return response({ error: "Feedback or review not found." }, 404);
    const now = new Date().toISOString();

    if (action === "reply") {
      const reply = typeof input.reply === "string" ? input.reply.trim() : "";
      if (item.kind !== "feedback") return response({ error: "A private reply cannot be sent to a public review." }, 400);
      if (reply.length < 2 || reply.length > 2000) return response({ error: "The reply must be 2 to 2,000 characters long." }, 400);
      db.prepare("UPDATE feedback_messages SET admin_reply=?,status='replied',updated_at=?,replied_at=?,replied_by=? WHERE id=? AND kind='feedback'").run(reply, now, now, user.id, id);
      audit(user.id, "feedback_replied", id);
    } else if (action === "review-status") {
      const status = input.status;
      if (item.kind !== "review" || (status !== "published" && status !== "hidden")) return response({ error: "Invalid review status." }, 400);
      db.prepare("UPDATE feedback_messages SET status=?,updated_at=? WHERE id=? AND kind='review'").run(status, now, id);
      audit(user.id, status === "published" ? "review_published" : "review_hidden", id);
    } else if (action === "review-delete") {
      if (item.kind !== "review") return response({ error: "Only reviews can be permanently deleted here." }, 400);
      db.prepare("DELETE FROM feedback_messages WHERE id=? AND kind='review'").run(id);
      audit(user.id, "review_deleted", id);
    } else {
      return response({ error: "This action is not supported." }, 400);
    }
    return response({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) return response({ error: "The request data is invalid." }, 400);
    return response({ error: "The update could not be saved. Please try again." }, 503);
  }
}
