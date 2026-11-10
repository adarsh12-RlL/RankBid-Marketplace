import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { detectMessageSpam, getMessagePosts, listMessageThreads, saveMessage } from "@/lib/message-center";
import { getUser, isOwner, limited, sameOrigin } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import type { MessageThread } from "@/lib/message-center";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_FILE_BYTES + 128 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const owner = (user: AuthUser) => isOwner(user);

function labelFor(thread: MessageThread, user: AuthUser) {
  if (thread.kind === "admin_group") return "Admin group";
  if (thread.kind === "owner_admin") return owner(user) ? "Administrator · private" : "Private message to owner";
  return owner(user) ? "Customer · private support" : "Private support with the owner";
}

function postSenderLabel(post: Record<string, unknown>, thread: MessageThread, user: AuthUser) {
  if (post.sender_id === user.id) return "You";
  if (owner(user)) return String(post.sender_email || "Account");
  if (thread.kind === "admin_group") return String(post.sender_email || "Administrator");
  return thread.kind === "customer_support" ? "Owner" : "Administrator";
}

async function boundedMultipartRequest(req: NextRequest) {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Message content is missing.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_MULTIPART_BYTES) {
        await reader.cancel();
        throw new Error("The message or attachment is larger than 20 MB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Request(req.url, { method: "POST", headers: req.headers, body: Buffer.concat(chunks, total) });
}

function matchesFileSignature(mime: string, data: Buffer) {
  if (mime === "image/png") return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/jpeg") return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mime === "image/gif") return data.length >= 6 && ["GIF87a", "GIF89a"].includes(data.toString("ascii", 0, 6));
  if (mime === "image/webp") return data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
  if (mime === "video/mp4" || mime === "video/quicktime") return data.length >= 12 && data.toString("ascii", 4, 8) === "ftyp";
  if (mime === "video/webm") return data.length >= 4 && data.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return false;
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return json({ error: "Please sign in to open messages." }, 401);
  try {
    const threads = listMessageThreads(user);
    return json({ threads: threads.map(thread => ({
      id: thread.id,
      kind: thread.kind,
      label: labelFor(thread, user),
      customerEmail: owner(user) && thread.kind === "customer_support" ? (getMessagePosts(thread).find(post => post.sender_id === thread.customer_id)?.sender_email || null) : null,
      adminEmail: owner(user) && thread.kind === "owner_admin" ? (getMessagePosts(thread).find(post => post.sender_id === thread.admin_id)?.sender_email || null) : null,
      updatedAt: thread.updated_at,
      posts: getMessagePosts(thread).map(post => ({
        id: post.id, senderId: post.sender_id, senderLabel: postSenderLabel(post, thread, user),
        body: post.body, createdAt: post.created_at,
        attachment: post.attachment_id ? { id: post.attachment_id, name: post.original_name, mime: post.mime_type, size: post.byte_size, url: `/api/messages/attachments/${encodeURIComponent(String(post.attachment_id))}` } : null,
      })),
    })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Messages could not be loaded.";
    return json({ error: message }, message.includes("included with") ? 403 : 503);
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return json({ error: "Please sign in before sending a message." }, 401);
  if (!sameOrigin(req)) return json({ error: "Invalid request origin." }, 403);
  if (limited(req, "private-messages", 30, 60_000)) return json({ error: "Too many messages. Please wait and try again." }, 429);
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) return json({ error: "Send messages using the secure message form." }, 415);
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_MULTIPART_BYTES) return json({ error: "The message or attachment is larger than 20 MB." }, 413);

  let storedPath = "";
  try {
    const bounded = await boundedMultipartRequest(req);
    const form = await bounded.formData();
    const threadIdValue = form.get("threadId"), bodyValue = form.get("body"), fileValue = form.get("file");
    if (typeof threadIdValue !== "string" || threadIdValue.length > 100 || typeof bodyValue !== "string" || bodyValue.length > 5000)
      return json({ error: "Message details are invalid or too long." }, 400);
    const thread = (await import("@/lib/message-center")).getMessageThread(user, threadIdValue);
    if (!thread) return json({ error: "This private conversation is unavailable to your account." }, 403);
    const body = bodyValue.trim();
    let attachment: { id: string; name: string; mime: string; size: number; storageName: string } | undefined;
    let bytes: Buffer | undefined;
    if (fileValue instanceof File && fileValue.size > 0) {
      if (fileValue.size > MAX_FILE_BYTES) return json({ error: "Images and videos must be 20 MB or smaller." }, 413);
      const mime = fileValue.type.toLowerCase();
      const extension = MIME_EXTENSIONS[mime];
      if (!extension) return json({ error: "Only PNG, JPEG, GIF, WebP, MP4, WebM, or QuickTime images and videos are allowed." }, 415);
      bytes = Buffer.from(await fileValue.arrayBuffer());
      if (!matchesFileSignature(mime, bytes)) return json({ error: "This file does not match its declared image or video format." }, 415);
      const safeOriginalName = path.basename(fileValue.name).replace(/[\u0000-\u001f\u007f]/g, "_").slice(0, 180) || `attachment.${extension}`;
      const storageName = `${crypto.randomUUID()}.${extension}`;
      const root = path.resolve(process.env.MESSAGE_UPLOAD_DIR || path.join(os.homedir(), ".rankbid", "message-uploads"));
      await fs.mkdir(root, { recursive: true, mode: 0o700 });
      storedPath = path.join(root, storageName);
      await fs.writeFile(storedPath, bytes, { flag: "wx", mode: 0o600 });
      attachment = { id: crypto.randomUUID(), name: safeOriginalName, mime, size: bytes.length, storageName };
    } else if (fileValue !== null && !(fileValue instanceof File)) {
      return json({ error: "Attachment is invalid." }, 400);
    }
    if (!body && !attachment) return json({ error: "Write a message or attach an image/video." }, 400);

    const spam = detectMessageSpam(user, body);
    if (spam.blocked) {
      if (storedPath) await fs.unlink(storedPath).catch(() => undefined);
      return json({ error: spam.banned ? "This account is suspended after three spam warnings. Contact the owner to request review." : "This message was held because it looks like repeated or rapid spam. Please rewrite it and slow down.", warning: true, warnings: spam.warnings, banned: spam.banned }, 429);
    }
    const postId = saveMessage(user, thread, body, attachment);
    return json({ ok: true, postId }, 201);
  } catch (error) {
    if (storedPath) await fs.unlink(storedPath).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Message could not be sent.";
    return json({ error: message }, message.includes("larger than 20 MB") ? 413 : 400);
  }
}
