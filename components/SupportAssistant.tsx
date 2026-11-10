"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUpRight, LifeBuoy, MessageCircle, Send, X, RotateCcw } from "lucide-react";

type ChatRole = "assistant" | "visitor";
type HelpLink = { label: string; href: string };
type ChatMessage = { id: number; role: ChatRole; text: string; offerContact?: boolean; links?: HelpLink[] };
type HelpQuestion = { label: string; patterns: string[]; answer: string; links?: HelpLink[] };

const initialMessage: ChatMessage = {
  id: 1,
  role: "assistant",
  text: "Hello! I’m RankBid Support. Choose a topic below or type a RankBid or RankLens question. I’ll explain supported tasks step by step and link you to the right page.",
};

const helpQuestions: HelpQuestion[] = [
  {
    label: "How do I create an account?",
    patterns: [
      "account", "create account", "new account", "sign up", "signup", "register",
      "account banana", "naya account", "account nahi ban", "account kaise", "account chalu",
      "create an account", "join", "sign in kaise", "login kaise"
    ],
    answer: "To create an account: Select 'Sign in' at the top right, then click 'New here? Create an account' below the form. Enter your email and choose a password with at least 12 characters. If you want to use Google sign-in, it will activate once the owner configures Google OAuth.",
    links: [{ label: "Open Sign In / Create Account", href: "/login" }],
  },
  {
    label: "How do I sign in with Google?",
    patterns: [
      "google", "gmail login", "google sign in", "google signin", "google se login",
      "google account", "gmail", "google login nahi", "google button", "oauth"
    ],
    answer: "On the Sign in page, select 'Continue with Google'. If the button shows a setup notice, Google OAuth keys (Client ID and Secret) need to be configured in the website's environment settings. Until then, you can create and access your account using your email and password directly.",
    links: [{ label: "Go to Sign In page", href: "/login" }],
  },
  {
    label: "Which payment methods can I use?",
    patterns: [
      "payment", "payment method", "pay with", "upi", "phonepe", "phone pay", "google pay",
      "paytm", "amazon pay", "debit card", "credit card", "qr code", "payment option",
      "paisa", "paise", "rupaye", "money", "pay", "payment chalu", "payment kaise"
    ],
    answer: "RankBid supports Stripe for international card/USD payments and Razorpay for Indian UPI (Google Pay, PhonePe, Paytm, QR) and Netbanking. Once the owner connects live gateway keys, these payment options appear automatically on the checkout page.",
    links: [{ label: "View FAQ on payments", href: "/faq" }],
  },
  {
    label: "Why is checkout unavailable or pending?",
    patterns: [
      "payment unavailable", "checkout unavailable", "payment not available", "cant pay",
      "cannot pay", "checkout not working", "merchant setup", "payment setup", "payment fail",
      "payment pending", "charged", "money deducted", "paid but"
    ],
    answer: "Checkout requires active payment gateway credentials (Stripe or Razorpay) and verified webhooks. A placement updates instantly as soon as the provider sends confirmation. If your payment was deducted but hasn't updated, message the admin below with your order time and reference.",
    links: [{ label: "Check FAQ", href: "/faq" }],
  },
  {
    label: "How are product ranks decided?",
    patterns: [
      "how rank", "ranking", "outbid", "rank decided", "leaderboard order", "position",
      "rank change", "rankbid kya hai", "kya hai", "kaise kaam karta", "how it works", "rules"
    ],
    answer: "RankBid is a transparent pay-to-rank ecosystem. Listings are ordered strictly by confirmed verified spend. The higher your net spend, the higher your position on the leaderboard. Ties are broken deterministically by whichever listing reached the amount first.",
    links: [{ label: "Read Placement Rules", href: "/rules" }, { label: "View Live Leaderboard", href: "/leaderboard" }],
  },
  {
    label: "How do I submit a product?",
    patterns: [
      "submit product", "add product", "claim rank", "claim a rank", "submit listing",
      "product submit", "product url", "claim"
    ],
    answer: "On the RankBid home page, enter your product URL, choose a category, and select 'Claim rank'. Complete your product title and description, then proceed to checkout. Your listing appears on the board immediately after confirmation.",
    links: [{ label: "Go to Home to Claim Rank", href: "/" }],
  },
  {
    label: "I forgot my password",
    patterns: ["forgot password", "reset password", "password reset", "password bhul", "password yaad nahi", "change password"],
    answer: "Use the password recovery option on the Sign in page. If you need manual recovery or assistance, send a private message to the site admin from this chat. Never share your current password or verification codes.",
  },
  {
    label: "Where are Website, Billing, Settings, and Guide?",
    patterns: ["customer id menu", "account menu", "profile menu", "where are billing settings", "website billing settings guide", "customer id", "account options"],
    answer: "Open your RankLens Websites dashboard and select the account area that shows your Customer ID in the top-right corner. The menu contains Website, Billing, Settings, and Guide.",
    links: [{ label: "Open RankLens dashboard", href: "/datafast/dashboard" }],
  },
  {
    label: "How do I send private feedback to Admin?",
    patterns: ["private feedback", "message admin", "contact admin", "send feedback", "support message", "admin reply", "reply link", "help", "madad"],
    answer: "Select 'Contact admin privately' below and send your message. Private feedback is visible only to the admin and expires after 30 days. You will receive a private ticket link to view admin replies.",
  },
];

const quickQuestions = helpQuestions.map(item => item.label);

function answerFor(question: string) {
  const normalized = question
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const match = helpQuestions.map(item => {
    const matchedPattern = item.patterns
      .map(pattern => pattern.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
      .filter(pattern => pattern && normalized.includes(pattern))
      .sort((one, two) => two.length - one.length)[0];
    return { item, score: matchedPattern?.length || 0 };
  }).filter(result => result.score > 0).sort((one, two) => two.score - one.score)[0]?.item;

  if (match) {
    return { text: match.answer, links: match.links, offerContact: false };
  }

  return {
    text: "I couldn’t find an exact match for that phrasing. Here are helpful links, or you can choose another question from the topics list, or send a message directly to the admin:",
    links: [
      { label: "Create an Account / Sign In", href: "/login" },
      { label: "Payment & Checkout FAQ", href: "/faq" },
      { label: "How Rankings Work", href: "/rules" },
    ],
    offerContact: true,
  };
}

export default function SupportAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [showContact, setShowContact] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, showContact, ticketUrl]);

  function resetChat() {
    setMessages([initialMessage]);
    setShowContact(false);
    setTicketUrl("");
    setQuestion("");
  }

  function ask(value: string) {
    const clean = value.trim();
    if (!clean) return;
    const answer = answerFor(clean);
    const now = Date.now();
    setMessages(current => [
      ...current,
      { id: now, role: "visitor", text: clean },
      { id: now + 1, role: "assistant", ...answer },
    ]);
    setQuestion("");
  }

  function onAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  async function sendSupportMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = contactMessage.trim();
    if (clean.length < 8) {
      setContactError("Please describe the issue in at least 8 characters.");
      return;
    }
    setContactBusy(true);
    setContactError("");
    try {
      const page = typeof window !== "undefined" ? window.location.pathname : "/";
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "feedback",
          name: "",
          email: contactEmail.trim(),
          subject: `Support request: ${page}`.slice(0, 120),
          body: `${clean}\n\nPage: ${page}`,
          publicConsent: false,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your message could not be sent. Please try again.");
      if (typeof data.ticketToken !== "string" || !data.ticketToken) {
        throw new Error("Your message was saved, but its private reply link could not be created. Please contact the admin from Feedback & reviews.");
      }
      setTicketUrl(`${window.location.origin}/feedback?ticket=${encodeURIComponent(data.ticketToken)}`);
      setContactMessage("");
      setMessages(current => [
        ...current,
        {
          id: Date.now(),
          role: "assistant",
          text: "Your private message has been sent to the admin. Save the private reply link below to check for a response. The message and link expire after 30 days.",
        },
      ]);
    } catch (error) {
      setContactError(error instanceof Error ? error.message : "Your message could not be sent. Please try again.");
    } finally {
      setContactBusy(false);
    }
  }

  function openContact(message = "") {
    setShowContact(true);
    setContactMessage(message);
    setContactError("");
  }

  return (
    <div className="rb-support-root">
      {open && (
        <section className="rb-support-panel" role="dialog" aria-modal="false" aria-labelledby="rb-support-title">
          <header className="rb-support-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="rb-support-icon"><LifeBuoy size={18} /></span>
              <div>
                <h2 id="rb-support-title">RankBid Support</h2>
                <p>Direct answers & helpful guides</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={resetChat}
                  style={{
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    color: "#93c5fd",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title="Back to all questions"
                >
                  <RotateCcw size={12} />
                  <span>Topics</span>
                </button>
              )}
              <button
                type="button"
                className="rb-support-close"
                aria-label="Close support assistant"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="rb-support-messages" ref={scrollRef} aria-live="polite">
            {messages.map(message => (
              <article key={message.id} className={`rb-support-message rb-support-${message.role}`}>
                <p>{message.text}</p>
                {message.links && (
                  <nav className="rb-support-answer-links" aria-label="Related help pages">
                    {message.links.map(link => (
                      <a key={link.href} href={link.href}>
                        {link.label}
                        <ArrowUpRight size={12} />
                      </a>
                    ))}
                  </nav>
                )}
                {message.offerContact && (
                  <button
                    className="rb-support-offer-contact"
                    type="button"
                    onClick={() =>
                      openContact(
                        messages[messages.length - 2]?.role === "visitor"
                          ? messages[messages.length - 2].text
                          : ""
                      )
                    }
                  >
                    Contact admin privately
                    <ArrowUpRight size={13} />
                  </button>
                )}
              </article>
            ))}

            {/* If on initial screen, show full prompt list */}
            {messages.length === 1 && (
              <div className="rb-support-prompts">
                <span>Choose a question</span>
                {quickQuestions.map(prompt => (
                  <button key={prompt} type="button" onClick={() => ask(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* If in conversation, provide Back / Suggestions buttons */}
            {messages.length > 1 && (
              <div style={{ marginTop: "10px", padding: "8px 0", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                <button
                  type="button"
                  onClick={resetChat}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "#152b42",
                    border: "1px solid #3b82f6",
                    borderRadius: "999px",
                    padding: "6px 12px",
                    color: "#93c5fd",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={12} />
                  ← Back to all topics
                </button>
                <button
                  type="button"
                  onClick={() => openContact()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#152b42",
                    border: "1px solid #496b8a",
                    borderRadius: "999px",
                    padding: "6px 12px",
                    color: "#dceaf6",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  Message admin
                  <ArrowUpRight size={12} />
                </button>
              </div>
            )}

            {showContact && (
              <form id="contact-admin" className="rb-support-contact" onSubmit={sendSupportMessage}>
                <div className="rb-support-contact-head">
                  <b>Private message to the admin</b>
                  <button type="button" aria-label="Close message form" onClick={() => setShowContact(false)}>
                    <X size={15} />
                  </button>
                </div>
                <p>Your message is private and is automatically deleted after 30 days. Email is optional.</p>
                <textarea
                  value={contactMessage}
                  onChange={event => setContactMessage(event.target.value)}
                  rows={3}
                  maxLength={1500}
                  required
                  minLength={8}
                  placeholder="Describe your question or issue…"
                  aria-label="Describe your issue"
                />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={event => setContactEmail(event.target.value)}
                  maxLength={254}
                  placeholder="Your Email (optional)"
                  aria-label="Email (optional)"
                />
                {contactError && <p className="rb-support-error" role="alert">{contactError}</p>}
                <button className="rb-support-send" type="submit" disabled={contactBusy}>
                  {contactBusy ? "Sending…" : "Send privately"}
                  <Send size={14} />
                </button>
              </form>
            )}

            {ticketUrl && (
              <a className="rb-support-ticket" href={ticketUrl}>
                Open private reply link
                <ArrowUpRight size={14} />
              </a>
            )}
          </div>

          <div className="rb-support-footer">
            <button type="button" className="rb-support-contact-link" onClick={() => openContact()}>
              Contact admin privately
            </button>
            <form className="rb-support-ask" onSubmit={onAsk}>
              <input
                value={question}
                onChange={event => setQuestion(event.target.value)}
                maxLength={1200}
                placeholder="Ask any question (e.g. account, payment, rank)..."
                aria-label="Ask the support assistant"
              />
              <button type="submit" aria-label="Send question" disabled={!question.trim()}>
                <Send size={16} />
              </button>
            </form>
            <small>
              Instant answers for RankBid & RankLens.{" "}
              <button
                type="button"
                onClick={resetChat}
                style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", textDecoration: "underline", padding: 0 }}
              >
                Reset topics
              </button>
            </small>
          </div>
        </section>
      )}
      <button
        type="button"
        className="rb-support-launcher"
        aria-label={open ? "Close RankBid support" : "Open RankBid support"}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        {open ? <X size={20} /> : <><MessageCircle size={19} /><span>Help</span></>}
      </button>
    </div>
  );
}
