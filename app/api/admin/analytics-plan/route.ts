import { NextRequest, NextResponse } from "next/server";
import { audit, getUser, isOwner, limited, sameOrigin } from "@/lib/auth";
import { ensureAnalyticsPlanSchema, listAnalyticsBotPlanAccess, listAnalyticsPlans, revokeAnalyticsBotPlanAccess, setAnalyticsBotPlanAccess } from "@/lib/analytics-plan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  if (!isOwner(getUser(req))) return response({ error: "Owner access is required." }, 403);
  const db=ensureAnalyticsPlanSchema();
  const requests=db.prepare(`SELECT r.id,r.plan_id,r.amount_cents,r.duration_days,r.currency,r.status,r.requested_at,u.id AS user_id,u.email
    FROM analytics_subscription_requests r JOIN users u ON u.id=r.user_id WHERE r.status='pending' ORDER BY r.requested_at ASC`).all();
  return response({ users: listAnalyticsBotPlanAccess(), requests });
}

export async function POST(req: NextRequest) {
  const admin = getUser(req);
  if (!admin || !isOwner(admin)) return response({ error: "Owner access is required." }, 403);
  if (!sameOrigin(req)) return response({ error: "Invalid request origin." }, 403);
  if (limited(req, "admin-analytics-plan", 30)) return response({ error: "Too many requests. Please try again later." }, 429);
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 4096) return response({ error: "The request is too large." }, 413);
    const input = JSON.parse(raw) as Record<string, unknown>;
    if (input.action === "approve-request" || input.action === "reject-request") {
      const requestId=typeof input.requestId === "string" ? input.requestId : "";
      if (!/^[0-9a-f-]{36}$/i.test(requestId)) return response({error:"Plan request not found."},400);
      const db=ensureAnalyticsPlanSchema();
      db.exec("BEGIN IMMEDIATE");
      try {
        const request=db.prepare("SELECT id,user_id,plan_id,duration_days,status FROM analytics_subscription_requests WHERE id=?").get(requestId) as {id:string;user_id:string;plan_id:string;duration_days:number;status:string}|undefined;
        if(!request || request.status!=="pending") { db.exec("ROLLBACK"); return response({error:"This plan request is no longer pending."},404); }
        const timestamp=new Date().toISOString();
        if(input.action === "reject-request") {
          db.prepare("UPDATE analytics_subscription_requests SET status='rejected',reviewed_at=?,reviewed_by=? WHERE id=? AND status='pending'").run(timestamp,admin.id,requestId);
          audit(admin.id,"analytics_plan_request_rejected",request.user_id);
          db.exec("COMMIT");
          return response({ok:true});
        }
        const durationDays=Number(request.duration_days);
        if(!Number.isInteger(durationDays)||durationDays<1||durationDays>3660) throw new Error("The requested plan duration is invalid.");
        const plan=listAnalyticsPlans().find(item=>item.id===request.plan_id);
        const current=db.prepare("SELECT expires_at FROM analytics_bot_plan_access WHERE user_id=?").get(request.user_id) as {expires_at:string}|undefined;
        const startsAt=current && Date.parse(current.expires_at)>Date.now()?Date.parse(current.expires_at):Date.now();
        const expiresAt=new Date(startsAt+durationDays*86400000).toISOString();
        if(!setAnalyticsBotPlanAccess(request.user_id,expiresAt,admin.id)) throw new Error("Customer account is unavailable.");
        db.prepare("UPDATE analytics_subscription_requests SET status='approved',reviewed_at=?,reviewed_by=? WHERE id=? AND status='pending'").run(timestamp,admin.id,requestId);
        audit(admin.id,"analytics_plan_request_approved",request.user_id,plan?.label || request.plan_id);
        db.exec("COMMIT");
      } catch(error) { db.exec("ROLLBACK"); throw error; }
      return response({ok:true});
    }
    const userId = typeof input.userId === "string" ? input.userId : "";
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(userId)) return response({ error: "Customer account not found." }, 400);
    if (input.action === "revoke") {
      if (!revokeAnalyticsBotPlanAccess(userId)) return response({ error: "Customer not found, or this account is an administrator." }, 404);
      audit(admin.id, "analytics_bot_plan_revoked", userId);
      return response({ ok: true });
    }
    if (input.action !== "activate" || typeof input.expiresAt !== "string") return response({ error: "Invalid plan action." }, 400);
    const expiry = new Date(input.expiresAt);
    const now = Date.now();
    if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= now || expiry.getTime() > now + 367 * 86400000)
      return response({ error: "The expiry date must be between 1 and 366 days from today." }, 400);
    const userExists = setAnalyticsBotPlanAccess(userId, expiry.toISOString(), admin.id);
    if (!userExists) return response({ error: "Customer not found, or this account is an administrator." }, 404);
    audit(admin.id, "analytics_bot_plan_activated", userId);
    return response({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) return response({ error: "Request data is invalid." }, 400);
    return response({ error: "Plan access could not be updated." }, 503);
  }
}
