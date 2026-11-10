import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getMessageAttachment } from "@/lib/message-center";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

export async function GET(req: NextRequest, context: { params: Promise<{ attachmentId: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to view this attachment." }, { status: 401 });
  const { attachmentId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(attachmentId)) return new NextResponse("Not found", { status: 404 });
  const attachment = getMessageAttachment(user, attachmentId);
  if (!attachment) return new NextResponse("Not found", { status: 404 });
  const extension = extensions[attachment.mime_type];
  if (!extension || !new RegExp(`^[0-9a-f-]{36}\\.${extension}$`, "i").test(attachment.storage_name)) return new NextResponse("Not found", { status: 404 });
  const root = path.resolve(process.env.MESSAGE_UPLOAD_DIR || path.join(os.homedir(), ".rankbid", "message-uploads"));
  const filePath = path.resolve(root, attachment.storage_name);
  if (path.dirname(filePath) !== root) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await fs.readFile(filePath);
    const asciiName = attachment.original_name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\;]/g, "_").slice(0, 180) || `attachment.${extension}`;
    const encodedName = encodeURIComponent(attachment.original_name).replace(/'/g, "%27");
    return new NextResponse(new Uint8Array(data), { headers: {
      "Content-Type": attachment.mime_type,
      "Content-Length": String(data.length),
      "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    } });
  } catch { return new NextResponse("Not found", { status: 404 }); }
}
