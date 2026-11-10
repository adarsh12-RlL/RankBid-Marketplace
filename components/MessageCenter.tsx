"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Paperclip, Send, ShieldAlert, Users } from "lucide-react";

type Attachment = { id: string; name: string; mime: string; size: number; url: string };
type Post = { id: string; senderId: string; senderLabel: string; body: string; createdAt: string; attachment: Attachment | null };
type Thread = { id: string; kind: "customer_support" | "admin_group" | "owner_admin"; label: string; customerEmail: string | null; adminEmail: string | null; updatedAt: string; posts: Post[] };

const MAX_BYTES = 20 * 1024 * 1024;
const sizeLabel = (bytes: number) => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const dateLabel = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function MessageCenter({ isAdmin }: { isAdmin: boolean }) {
  const [threads, setThreads] = useState<Thread[]>([]), [selected, setSelected] = useState(""), [body, setBody] = useState(""), [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true), [sending, setSending] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [showInbox, setShowInbox] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const active = useMemo(() => threads.find(thread => thread.id === selected) || threads[0] || null, [threads, selected]);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/messages", { cache: "no-store", credentials: "same-origin" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Messages could not be loaded.");
    const next = Array.isArray(data.threads) ? data.threads as Thread[] : [];
    setThreads(next);
    setSelected(current => next.some(thread => thread.id === current) ? current : next[0]?.id || "");
  }, []);

  useEffect(() => {
    let alive = true;
    void refresh().catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : "Messages could not be loaded."); }).finally(() => { if (alive) setLoading(false); });
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh().catch(() => undefined); }, 12000);
    return () => { alive = false; clearInterval(timer); };
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || (!body.trim() && !file)) return;
    if (file && file.size > MAX_BYTES) { setError("Images and videos must be 20 MB or smaller."); return; }
    setSending(true); setError(""); setNotice("");
    try {
      const form = new FormData(); form.set("threadId", active.id); form.set("body", body);
      if (file) form.set("file", file, file.name);
      const response = await fetch("/api/messages", { method: "POST", body: form, credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) {
        if (data.warning) setNotice(`Warning ${data.warnings || ""} of 3: repeated or rapid messages are blocked. ${data.banned ? "This account has been suspended; only the owner can restore it." : "Rewrite your message and slow down."}`);
        throw new Error(data.error || "Message could not be sent.");
      }
      setBody(""); setFile(null); if (picker.current) picker.current.value = "";
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Message could not be sent."); }
    finally { setSending(false); }
  }

  return <section className="message-center" aria-label="Private messages">
    <header className="message-center-heading"><div><span className="message-center-kicker"><MessageCircle size={14}/> {isAdmin ? "RANKBID ADMIN MESSAGES" : "RANKLENS PRO SUPPORT"}</span><h1>{isAdmin ? "Messages" : "Private support"}</h1><p>{isAdmin ? "Admin group conversations, customer support and private owner messages." : "This conversation is visible only to you and the owner."}</p></div><div className="message-privacy-pill"><ShieldAlert size={15}/> Private conversations</div></header>
    {notice && <p className="message-center-notice" role="status">{notice}</p>}{error && <p className="message-center-error" role="alert">{error}</p>}
    {loading ? <div className="message-center-loading" role="status">Loading messages…</div> : !threads.length ? <div className="message-center-empty">No conversations are available for this account.</div> : <div className={`message-center-layout ${showInbox ? "show-inbox" : "thread-open"}`}>
      <aside className="message-center-sidebar" aria-label="Conversations"><div className="message-center-list-heading"><strong>Inbox</strong><span>{threads.length}</span></div>{threads.map(thread => <button type="button" key={thread.id} onClick={() => { setSelected(thread.id); setShowInbox(false); setError(""); }} className={`message-thread-choice ${active?.id === thread.id ? "active" : ""}`}><i>{thread.kind === "admin_group" ? <Users size={15}/> : <MessageCircle size={15}/>}</i><span><strong>{thread.label}</strong><small>{thread.kind === "customer_support" && thread.customerEmail ? thread.customerEmail : thread.kind === "owner_admin" && thread.adminEmail ? thread.adminEmail : thread.posts.at(-1)?.body || (thread.posts.at(-1)?.attachment ? "Shared an image or video" : "Start a conversation")}</small></span></button>)}</aside>
      {active && <section className="message-center-conversation"><header className="message-conversation-header"><button type="button" className="message-mobile-back" onClick={() => setShowInbox(true)}><ArrowLeft size={17}/> Inbox</button><i>{active.kind === "admin_group" ? <Users size={16}/> : <MessageCircle size={16}/>}</i><div><strong>{active.label}</strong><small>{active.kind === "admin_group" ? "Visible to administrators only" : active.kind === "owner_admin" ? (active.adminEmail || "Direct administrator conversation") : active.customerEmail || "Visible only to you and the owner"}</small></div></header>
        <div className="message-post-list" aria-live="polite">{active.posts.length ? active.posts.map(post => <article key={post.id} className="message-post"><div className="message-post-meta"><strong>{post.senderLabel}</strong><time dateTime={post.createdAt}>{dateLabel(post.createdAt)}</time></div>{post.body && <p>{post.body}</p>}{post.attachment && <div className="message-post-attachment">{post.attachment.mime.startsWith("image/") ? <a href={post.attachment.url} target="_blank" rel="noreferrer"><img src={post.attachment.url} alt={post.attachment.name} loading="lazy"/></a> : <video src={post.attachment.url} controls preload="metadata"/>}<small>{post.attachment.name} · {sizeLabel(post.attachment.size)}</small></div>}</article>) : <div className="message-first-note"><MessageCircle size={25}/><strong>No messages yet</strong><span>Send a private message to start the conversation.</span></div>}</div>
        <form className="message-composer" onSubmit={submit}><label className="sr-only" htmlFor="message-body">Message</label><textarea id="message-body" value={body} onChange={event => setBody(event.target.value)} maxLength={5000} placeholder="Write a message…" rows={3}/><div className="message-composer-actions"><div><input ref={picker} type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime" onChange={event => { const picked = event.target.files?.[0] || null; setFile(picked); setError(picked && picked.size > MAX_BYTES ? "Images and videos must be 20 MB or smaller." : ""); }} className="sr-only" aria-label="Attach an image or video"/><button type="button" className="message-attach-button" onClick={() => picker.current?.click()}><Paperclip size={15}/> Photo or video</button><small>Up to 20 MB · no other files</small>{file && <button type="button" className="message-file-chip" onClick={() => { setFile(null); if (picker.current) picker.current.value = ""; }}>{file.name} · {sizeLabel(file.size)} ×</button>}</div><button disabled={sending || (!body.trim() && !file)} className="message-send-button"><Send size={15}/>{sending ? "Sending…" : "Send"}</button></div><small className="message-safety-copy">Automated anti-spam checks can hold repeated or rapid messages. Account restrictions are reviewed by the owner.</small></form>
      </section>}
    </div>}
  </section>;
}
