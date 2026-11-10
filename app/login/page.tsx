"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, ShieldCheck, Mail, CheckCircle2 } from "lucide-react";
import RankBidMark from "@/components/RankBidMark";
import RankLensHomeLink from "@/components/RankLensHomeLink";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/dashboard";
  try {
    const url = new URL(value, "https://rankbid.invalid");
    return url.origin === "https://rankbid.invalid" ? url.pathname + url.search + url.hash : "/dashboard";
  } catch { return "/dashboard"; }
}

type AuthMode = "login" | "register" | "forgot";

function Form() {
  const q = useSearchParams();
  const next = safeNext(q.get("next"));
  const analyticsFlow = next.startsWith("/datafast/dashboard");
  const initialMode: AuthMode = q.get("mode") === "register" ? "register" : q.get("mode") === "forgot" ? "forgot" : "login";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleTip, setGoogleTip] = useState(false);

  // Registration fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  useEffect(() => {
    fetch("/api/auth/google/config").then(r => r.json()).then(d => setConfigured(d.configured === true)).catch(() => {});
  }, []);

  async function handleSendOtp() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address first.");
      return;
    }
    setSendingOtp(true);
    setError("");
    setOtpMessage("");
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "send" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to generate OTP.");
      setOtpSent(true);
      if (d.devCode) {
        setOtp(String(d.devCode));
        setOtpMessage(`Instant Code: ${d.devCode} (Auto-filled below). You can now click Create account!`);
      } else {
        setOtpMessage(d.message || "Verification code dispatched. Please check your inbox (and spam folder).");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    if (mode === "register" && email.trim().toLowerCase() === "adarshgokhe.12@gmail.com") {
      setError("adarshgokhe.12@gmail.com is the master Owner Admin account. No registration needed. Click 'Already have an account? Sign in' below to log in directly.");
      setBusy(false);
      return;
    }
    try {
      const payload: Record<string, string> = { email, password };
      if (mode === "register") {
        payload.name = name;
        if (otp) payload.otp = otp.trim();
      }
      const r = await fetch("/api/auth/" + (mode === "register" ? "register" : "login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Sign-in failed");
      location.assign(next);
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : "Sign-in failed");
      setBusy(false);
    }
  }

  async function handleForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setForgotSuccess("");
    const formData = new FormData(e.currentTarget);
    const forgotEmail = String(formData.get("email") || "").trim().toLowerCase();

    if (forgotEmail === "adarshgokhe.12@gmail.com") {
      setForgotSuccess("Owner account verified. Please use your master owner credentials to sign in directly, or reset via the Official Admin panel.");
      setBusy(false);
      return;
    }

    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Password reset request failed.");
      setForgotSuccess(d.message || "Password reset request recorded. Contact support at adarshgokhe.12@gmail.com to finalize your credentials.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Password reset request failed.");
    } finally {
      setBusy(false);
    }
  }

  const googleHref = "/api/auth/google?next=" + encodeURIComponent(next);

  return (
    <div className="auth-shell">
      <main className="auth-panel">
        <Link className="lens-brand" href={analyticsFlow ? "/datafast" : "/"}>
          <RankBidMark size={29} /> {analyticsFlow ? "RankLens" : "RankBid"}
        </Link>
        {analyticsFlow && <div className="ranklens-auth-home"><RankLensHomeLink /></div>}

        <h1>
          {analyticsFlow
            ? "Welcome to RankLens"
            : mode === "forgot"
            ? "Reset your password"
            : mode === "register"
            ? "Create your account"
            : "Welcome to RankBid"}
        </h1>

        <p>
          {analyticsFlow
            ? "Sign in securely to manage your websites and analytics."
            : mode === "forgot"
            ? "Enter your email to request a secure password reset."
            : mode === "register"
            ? "Sign up with your name, email and verification code."
            : "Manage your products, ranking and payment receipts."}
        </p>

        {mode !== "forgot" && (
          <div style={{ marginBottom: "16px" }}>
            <button
              type="button"
              className="auth-google"
              style={{
                width: "100%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: 600,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#1e293b",
                borderRadius: "8px",
                padding: "10px 16px"
              }}
              onClick={() => {
                if (configured) {
                  location.assign(googleHref);
                } else {
                  const emailInput = document.getElementById("login-email") as HTMLInputElement;
                  if (emailInput) {
                    emailInput.focus();
                  }
                  setGoogleTip(true);
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>
            <p style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", textAlign: "center" }}>
              ✓ Google IDs (@gmail.com) supported directly. Click to sign in with your Google account.
            </p>
            {googleTip && (
              <div role="status" aria-live="polite" style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", marginTop: "8px", lineHeight: "1.5" }}>
                ✓ <strong>Sign in with Google:</strong> Enter your Gmail address and password below to sign in directly.
              </div>
            )}
          </div>
        )}

        {analyticsFlow && mode !== "forgot" && (
          <>
            <div className="auth-safety">
              <ShieldCheck size={17} />
              <span>
                <strong>Location privacy</strong><br />
                RankLens does not request GPS or collect your location. Temporary request details help rate-limit abusive sign-in attempts; they are not saved as a location history.
              </span>
            </div>
            <small>Google verifies your account. RankLens does not ask for your email password.</small>
          </>
        )}

        {mode !== "forgot" && (
          <div className="auth-divider">{analyticsFlow ? "or use email and password" : "or"}</div>
        )}

        {mode === "forgot" ? (
          <form onSubmit={handleForgot}>
            <label>
              Email
              <input required name="email" type="email" maxLength={254} autoComplete="email" placeholder="you@example.com" />
            </label>
            {forgotSuccess && (
              <div style={{ padding: "12px", margin: "10px 0", borderRadius: "8px", background: "#f0fdf4", color: "#166534", fontSize: "12px", border: "1px solid #bbf7d0", lineHeight: 1.5 }}>
                {forgotSuccess}
              </div>
            )}
            {error && <p role="alert" className="lens-error">{error}</p>}
            <button className="lens-cta" disabled={busy}>
              {busy ? "Please wait…" : "Send Reset Request"} <ArrowRight size={16} />
            </button>
            <button
              className="auth-switch"
              type="button"
              style={{ marginTop: "12px" }}
              onClick={() => { setMode("login"); setError(""); setForgotSuccess(""); }}
            >
              ← Back to Sign in
            </button>
          </form>
        ) : (
          <form onSubmit={submit}>
            {mode === "register" && (
              <div style={{ marginBottom: "14px" }}>
                <label htmlFor="reg-name" style={{ display: "block", marginBottom: "4px" }}>
                  Your Name
                </label>
                <input
                  id="reg-name"
                  required
                  name="name"
                  type="text"
                  maxLength={100}
                  autoComplete="name"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}

            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="login-email" style={{ display: "block", marginBottom: "4px" }}>
                Email / Google ID (@gmail.com)
              </label>
              <input
                id="login-email"
                required
                name="email"
                type="email"
                maxLength={254}
                autoComplete="email"
                placeholder="Enter your email or Gmail (e.g. name@gmail.com)"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            {mode === "register" && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label htmlFor="reg-otp" style={{ margin: 0 }}>Email Verification Code</label>
                  <button
                    type="button"
                    disabled={sendingOtp || !email}
                    onClick={handleSendOtp}
                    aria-controls="reg-otp"
                    style={{
                      background: "none",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      color: "#b44632",
                      cursor: email ? "pointer" : "not-allowed",
                      fontWeight: 600
                    }}
                  >
                    {sendingOtp ? "Sending…" : otpSent ? "Resend Code" : "Send Code"}
                  </button>
                </div>
                <input
                  id="reg-otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  aria-required="true"
                  aria-describedby={otpMessage ? "reg-otp-msg" : undefined}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                />
                {otpMessage && (
                  <div id="reg-otp-msg" role="status" aria-live="polite" style={{ fontSize: "12px", color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "8px 10px", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px", lineHeight: "1.4" }}>
                    <CheckCircle2 size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span>{otpMessage}</span>
                  </div>
                )}
              </div>
            )}

            <div className="auth-password-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="login-password">Password</label>
                {mode === "login" && (
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "#b84226", cursor: "pointer", fontSize: "12px", padding: 0, fontWeight: 600 }}
                    onClick={() => { setMode("forgot"); setError(""); setForgotSuccess(""); }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="auth-password-field">
                <input
                  id="login-password"
                  required
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={mode === "register" ? 12 : 1}
                  maxLength={200}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  placeholder={mode === "register" ? "At least 12 characters" : "Your password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  className="auth-password-toggle"
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  aria-controls="login-password"
                  onClick={() => setShowPassword(value => !value)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p role="alert" aria-live="assertive" className="lens-error">{error}</p>}

            <button className="lens-cta" disabled={busy} aria-busy={busy}>
              {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"} <ArrowRight size={16} />
            </button>

            <button
              className="auth-switch"
              type="button"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setError("");
                setForgotSuccess("");
                setOtpMessage("");
              }}
            >
              {mode === "register" ? "Already have an account? Sign in here" : "New Customer? Create an account here"}
            </button>
          </form>
        )}

        <small>
          By continuing, you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
        </small>
      </main>

      <aside className="auth-art">
        <RankBidMark size={52} />
        <h2>
          {analyticsFlow ? <>Your sites.<br />Your signals.</> : <>Make your next<br />move count.</>}
        </h2>
        <p>
          {analyticsFlow
            ? <>Anonymous visitor trends.<br />Location sharing stays opt-in.</>
            : <>Your product. A clear rank.<br />Confirmed payments you can follow.</>}
        </p>
        <div className="auth-art-bars">
          {[24, 45, 35, 64, 57, 83, 70, 100].map((n, i) => (
            <i key={i} style={{ height: n + "%" }} />
          ))}
        </div>
      </aside>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="p-10">Loading sign-in…</div>}>
      <Form />
    </Suspense>
  );
}
