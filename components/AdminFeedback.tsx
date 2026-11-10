"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Eye, EyeOff, MessageSquareText, RefreshCw, Send, Star, Trash2 } from "lucide-react";

type Item = { id: string; kind: "feedback" | "review"; user_id: string | null; display_name: string; email: string; subject: string; body: string; rating: number | null; status: string; public_allowed: number; public_status: string; admin_reply: string; created_at: string; updated_at: string; replied_at: string | null };
type Filter = "all" | "feedback" | "review";

function dateLabel(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminFeedback() {
  const [items, setItems] = useState<Item[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/feedback", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Inbox could not be loaded.");
      const next: Item[] = Array.isArray(data.items) ? data.items : [];
      setItems(next);
      setReplies(Object.fromEntries(next.map(item => [item.id, item.admin_reply || ""])));
      setSelectedId(current => next.some(item => item.id === current) ? current : next[0]?.id || "");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Inbox could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function update(id: string, action: "reply" | "review-status" | "review-delete", values: { reply?: string; status?: string } = {}) {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, ...values }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The update could not be saved.");
      if (action === "review-delete") {
        setSelectedId("");
        setMobileThreadOpen(false);
        setNotice("Review permanently deleted.");
      } else {
        setNotice(action === "reply" ? "Private reply saved. The sender can check it using their ticket link." : values.status === "published" ? "Review published for everyone." : "Review hidden from the public page.");
      }
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The update could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  function reply(event: FormEvent<HTMLFormElement>, item: Item) {
    event.preventDefault();
    void update(item.id, "reply", { reply: replies[item.id] || "" });
  }

  const visible = useMemo(() => items.filter(item => filter === "all" || item.kind === filter), [items, filter]);
  const selected = visible.find(item => item.id === selectedId) || visible[0] || null;
  const messageCount = items.filter(item => item.kind === "feedback").length;
  const reviewCount = items.filter(item => item.kind === "review").length;
  const openCount = items.filter(item => item.kind === "feedback" && item.status === "open").length;

  return <section className="rankbid-admin-feedback" aria-labelledby="admin-feedback-title">
    <div className="rankbid-admin-feedback-head">
      <div><span className="rankbid-feedback-eyebrow">ADMIN INBOX</span><h2 id="admin-feedback-title">Messages &amp; reviews</h2><p>{openCount} new private {openCount === 1 ? "message" : "messages"} · Private messages are only visible here and are deleted after 30 days.</p></div>
      <button type="button" className="rankbid-feedback-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Refresh</button>
    </div>
    {error && <p role="alert" className="rankbid-feedback-alert">{error}</p>}
    {notice && <p role="status" className="rankbid-feedback-success">{notice}</p>}
    <div className={"rankbid-admin-inbox " + (mobileThreadOpen ? "thread-open" : "")}>
      <aside className="rankbid-admin-inbox-sidebar" aria-label="Feedback inbox">
        <div className="rankbid-admin-inbox-filters" role="tablist" aria-label="Filter inbox">
          {(["all", "feedback", "review"] as const).map(value => <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? "active" : ""} onClick={() => { setFilter(value); setMobileThreadOpen(false); }}>{value === "all" ? `All ${items.length}` : value === "feedback" ? `Messages ${messageCount}` : `Reviews ${reviewCount}`}</button>)}
        </div>
        <div className="rankbid-admin-inbox-list">
          {loading ? <p className="rankbid-feedback-empty">Loading inbox…</p> : visible.length ? visible.map(item => <button key={item.id} type="button" className={"rankbid-admin-inbox-row " + (selected?.id === item.id ? "selected" : "")} onClick={() => { setSelectedId(item.id); setMobileThreadOpen(true); }}>
            <span className={"rankbid-admin-inbox-avatar " + item.kind}>{item.kind === "review" ? <Star size={15} fill="currentColor"/> : <MessageSquareText size={15}/>}</span>
            <span className="rankbid-admin-inbox-row-copy"><b>{item.email || item.display_name || "Website visitor"}</b><span>{item.kind === "review" ? `${item.rating || 0}/5 · ${item.body}` : item.body}</span></span>
            <span className="rankbid-admin-inbox-row-meta"><time>{new Date(item.created_at).toLocaleDateString()}</time>{item.kind === "feedback" && item.status === "open" && <i aria-label="New message"/>}</span>
          </button>) : <p className="rankbid-feedback-empty">{filter === "all" ? "Your inbox is empty." : filter === "feedback" ? "No private messages yet." : "No customer reviews yet."}</p>}
        </div>
      </aside>

      <div className="rankbid-admin-inbox-content">
        {!selected ? <div className="rankbid-admin-inbox-empty"><MessageSquareText size={28}/><b>Select a message</b><span>Private messages and customer reviews are shown only in this admin inbox.</span></div> : <article className="rankbid-admin-thread" aria-label={selected.kind === "feedback" ? "Private feedback conversation" : "Customer review"}>
          <header className="rankbid-admin-thread-head">
            <button type="button" className="rankbid-admin-thread-back" onClick={() => setMobileThreadOpen(false)}>← Inbox</button>
            <div><span className={"rankbid-admin-kind " + selected.kind}>{selected.kind === "feedback" ? <MessageSquareText size={13}/> : <Star size={13} fill="currentColor"/>}{selected.kind === "feedback" ? "Private message" : `Customer review · ${selected.rating || 0}/5`}</span><h3>{selected.email || selected.display_name || "Website visitor"}</h3>{selected.email && <a href={"mailto:" + selected.email}>{selected.email}</a>}</div>
            <time>{dateLabel(selected.created_at)}</time>
          </header>
          <div className="rankbid-admin-thread-body">
            <div className="rankbid-admin-thread-bubble"><p>{selected.body}</p><time>{dateLabel(selected.created_at)}</time></div>
            {selected.kind === "feedback" && selected.admin_reply && <div className="rankbid-admin-thread-bubble admin-reply"><b>Your reply</b><p>{selected.admin_reply}</p>{selected.replied_at && <time>{dateLabel(selected.replied_at)}</time>}</div>}
          </div>
          {selected.kind === "feedback" ? <form className="rankbid-admin-reply-form rankbid-admin-thread-reply" onSubmit={event => reply(event, selected)}>
            <label htmlFor={"reply-" + selected.id}>Reply privately</label>
            <textarea id={"reply-" + selected.id} value={replies[selected.id] || ""} onChange={event => setReplies(current => ({...current,[selected.id]:event.target.value}))} maxLength={2000} rows={3} placeholder="Write a private reply…"/>
            <button type="submit" disabled={busyId === selected.id || (replies[selected.id] || "").trim().length < 2}><Send size={14}/>{busyId === selected.id ? "Saving…" : selected.admin_reply ? "Update reply" : "Send reply"}</button>
            <small>Replies are not emailed. The sender can see yours through their private ticket link.</small>
          </form> : <div className="rankbid-admin-review-actions">
            {selected.status === "published" ? <button type="button" onClick={() => void update(selected.id,"review-status",{status:"hidden"})} disabled={busyId === selected.id}><EyeOff size={14}/>Hide from RankLens</button> : <button type="button" onClick={() => void update(selected.id,"review-status",{status:"published"})} disabled={busyId === selected.id}><Eye size={14}/>{selected.status === "hidden" ? "Republish review" : "Publish review"}</button>}
            <span><Check size={14}/>{selected.status === "published" ? "Visible at the bottom of RankLens" : "Hidden from public view"}</span>
            <button type="button" className="rankbid-admin-delete-review" onClick={() => { if (window.confirm("Permanently delete this review? This cannot be undone.")) void update(selected.id,"review-delete"); }} disabled={busyId === selected.id}><Trash2 size={14}/>Delete review</button>
          </div>}
        </article>}
      </div>
    </div>
  </section>;
}
