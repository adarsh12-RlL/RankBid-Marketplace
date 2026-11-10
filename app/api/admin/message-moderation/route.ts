import { NextRequest, NextResponse } from "next/server";
import { audit, getUser, isOwner, limited, sameOrigin } from "@/lib/auth";
import { listModerationAccounts, unbanMessageAccount } from "@/lib/message-center";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  if (!isOwner(getUser(req))) return json({ error: "Owner access is required." }, 403);
  return json({ accounts: listModerationAccounts() });
}

export async function POST(req: NextRequest) {
  const owner = getUser(req);
  if (!owner || !isOwner(owner)) return json({ error: "Owner access is required." }, 403);
  if (!sameOrigin(req)) return json({ error: "Invalid request origin." }, 403);
  if (limited(req, "message-moderation", 20)) return json({ error: "Too many requests. Please try again later." }, 429);
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 2048) return json({ error: "Request is too large." }, 413);
    const input = JSON.parse(raw) as { action?: unknown; userId?: unknown };
    if (input.action !== "unban" || typeof input.userId !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(input.userId)) return json({ error: "Choose a valid account." }, 400);
    if (!unbanMessageAccount(input.userId)) return json({ error: "This account could not be found." }, 404);
    audit(owner.id, "message_account_unbanned", input.userId);
    return json({ ok: true });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Account status could not be changed." }, 400); }
}
