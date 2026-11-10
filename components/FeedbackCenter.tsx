"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, MessageSquareText, Star } from "lucide-react";

type Ticket = { body: string; status: string; createdAt: string; reply: string | null; repliedAt: string | null };

const inputClass = "mt-1 block w-full rounded-xl border border-[#d9e3ed] bg-white/80 px-3 py-2.5 text-sm text-[#17283b] outline-none transition focus:border-[#347fb9] focus:ring-2 focus:ring-[#347fb9]/15 dark:border-[#304156] dark:bg-[#111c2a] dark:text-[#edf4fb]";

export default function FeedbackCenter() {
  const [kind, setKind] = useState<"feedback" | "review">("feedback");
  const [ticketToken, setTicketToken] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [ticketError, setTicketError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(5);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountChecked, setAccountChecked] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("kind") === "review") setKind("review");
    const token = params.get("ticket") || "";
    if (token) {
      setTicketToken(token);
      void loadTicket(token);
    }
    void fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" }).then(async response => {
      const data = response.ok ? await response.json() : { user: null };
      setAccountEmail(typeof data.user?.email === "string" ? data.user.email : "");
    }).catch(() => setAccountEmail("")).finally(() => setAccountChecked(true));
  }, []);

  async function loadTicket(token: string) {
    setTicketError("");
    try {
      const response = await fetch("/api/feedback?ticket=" + encodeURIComponent(token), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The private reply link could not be opened.");
      setTicket(data.ticket);
    } catch (failure) {
      setTicketError(failure instanceof Error ? failure.message : "The private reply link could not be opened.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (kind === "review" && !accountEmail) {
      setError("Please sign in before submitting a review. Your account email is attached automatically.");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          ...(kind === "feedback" ? { name: form.get("name"), email: form.get("email") } : {}),
          body: form.get("body"),
          rating: kind === "review" ? rating : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission failed. Please try again.");
      formElement.reset();
      if (data.ticketToken) {
        const token = String(data.ticketToken);
        setTicketToken(token);
        window.history.replaceState({}, "", "/feedback?ticket=" + encodeURIComponent(token));
        await loadTicket(token);
      } else {
        setSuccess(data.message || "Your review was submitted.");
        setRating(5);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyTicketLink() {
    const url = window.location.origin + "/feedback?ticket=" + encodeURIComponent(ticketToken);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setTicketError("Could not copy the link. Save the private ticket link from the browser address bar.");
    }
  }

  function closeTicket() {
    setTicketToken("");
    setTicket(null);
    setTicketError("");
    window.history.replaceState({}, "", "/feedback");
  }

  const hasTicket = Boolean(ticketToken);

  return <main className="rankbid-reading-page rankbid-feedback-page">
    <section className="rankbid-feedback-hero" aria-labelledby="feedback-page-title">
      <div className="rankbid-feedback-hero-copy">
        <span className="rankbid-feedback-hero-kicker"><MessageSquareText size={14}/> RANKBID SUPPORT</span>
        <h1 id="feedback-page-title">Your voice<br/><em>moves us forward.</em></h1>
        <p>Send a private message to the admin or share your experience in a customer review.</p>
        <div className="rankbid-feedback-hero-pills"><span><i/>Private admin inbox</span><span><i/>Customer reviews</span></div>
      </div>
      <div className="rankbid-feedback-hero-art" aria-hidden="true"><span className="feedback-orbit orbit-one"/><span className="feedback-orbit orbit-two"/><span className="feedback-art-bubble"><MessageSquareText size={40}/><i/><i/><i/></span><span className="feedback-art-star">✦</span><span className="feedback-art-dot dot-one"/><span className="feedback-art-dot dot-two"/></div>
    </section>

    {hasTicket ? <section className="rankbid-feedback-card" aria-labelledby="feedback-ticket-title">
      <div className="rankbid-feedback-card-head"><div><span className="rankbid-feedback-eyebrow">PRIVATE MESSAGE</span><h2 id="feedback-ticket-title">Your feedback thread</h2></div><button type="button" className="rankbid-feedback-secondary" onClick={closeTicket}>Back to feedback</button></div>
      {ticketError ? <p role="alert" className="rankbid-feedback-alert">{ticketError}</p> : ticket ? <>
        <p className="rankbid-feedback-message">{ticket.body}</p>
        {ticket.reply ? <div className="rankbid-feedback-reply"><b>RankBid admin reply</b><p>{ticket.reply}</p>{ticket.repliedAt && <time>{new Date(ticket.repliedAt).toLocaleString()}</time>}</div> : <p className="rankbid-feedback-pending" role="status">There is no admin reply yet. Save this private link and check again later.</p>}
        <button type="button" className="rankbid-feedback-secondary mt-4" onClick={() => void loadTicket(ticketToken)}><Check size={14}/> Check for a reply</button>
      </> : <p className="rankbid-feedback-pending" role="status">Loading your private message…</p>}
      <div className="rankbid-feedback-ticket-note"><div><b>Private reply link</b><p>Your feedback and this link expire after 30 days. Save the link and do not share it with others.</p></div><button type="button" onClick={() => void copyTicketLink()}><Copy size={14}/>{copied ? "Copied" : "Copy private link"}</button></div>
    </section> : <section className="rankbid-feedback-card" aria-labelledby="feedback-form-title">
      <div className="rankbid-feedback-tabs" role="tablist" aria-label="Choose feedback or review">
        <button type="button" role="tab" aria-selected={kind === "feedback"} className={kind === "feedback" ? "active" : ""} onClick={() => { setKind("feedback"); setError(""); setSuccess(""); }}>Private feedback</button>
        <button type="button" role="tab" aria-selected={kind === "review"} className={kind === "review" ? "active" : ""} onClick={() => { setKind("review"); setError(""); setSuccess(""); }}>Public review</button>
      </div>
      <h2 id="feedback-form-title">{kind === "feedback" ? "Send a message to the admin" : "Share your review"}</h2>
      <p className="rankbid-feedback-help">{kind === "feedback" ? "Your message is private and visible only to the admin. It is automatically deleted after 30 days. Save the private link to check for a reply." : "Published reviews may appear on the RankBid and RankLens home pages."}</p>
      {kind === "review" && (!accountChecked || !accountEmail) && <div className="rankbid-feedback-auth-note" role="status">{!accountChecked ? "Checking your sign-in…" : <>Sign in to write a review. <Link href={"/login?next=" + encodeURIComponent("/feedback?kind=review")}>Sign in or create an account</Link></>}</div>}
      {kind === "review" && accountEmail && <p className="rankbid-feedback-account">Signed in as <b>{accountEmail}</b></p>}
      <form onSubmit={submit} className="rankbid-feedback-form">
        {kind === "feedback" && <>
          <label>Name <span>(optional)</span><input className={inputClass} name="name" autoComplete="name" maxLength={80} placeholder="Your name"/></label>
          <label>Email <span>(optional, visible only to the admin)</span><input className={inputClass} name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com"/></label>
        </>}
        {kind === "review" && accountEmail && <>
          <fieldset><legend>Rating</legend><div className="rankbid-rating-picker">{[1,2,3,4,5].map(value => <button key={value} type="button" aria-label={value + " star" + (value === 1 ? "" : "s")} aria-pressed={rating === value} onClick={() => setRating(value)}><Star size={22} fill={rating >= value ? "currentColor" : "none"}/></button>)}</div></fieldset>
        </>}
        {kind === "feedback" && <label>Message<textarea className={inputClass} name="body" required minLength={8} maxLength={2000} rows={5} placeholder="Write a question or suggestion…"/></label>}
        {kind === "review" && accountEmail && <label>Your review<textarea className={inputClass} name="body" required minLength={8} maxLength={2000} rows={5} placeholder="Share your experience…"/></label>}
        {error && <p className="rankbid-feedback-alert" role="alert">{error}</p>}
        {success && <p className="rankbid-feedback-success" role="status">{success}</p>}
        {(kind === "feedback" || accountEmail) && <button className="rankbid-feedback-submit" disabled={busy}>{busy ? "Sending…" : kind === "feedback" ? "Send privately to admin" : "Submit review"}</button>}
      </form>
    </section>}

  </main>;
}
