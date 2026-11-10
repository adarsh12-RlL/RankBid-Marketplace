"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

type Account = { id: string; email: string; role: string; warnings: number; banned_at: string | null; updated_at: string };
export default function AdminMessageModeration() {
  const [accounts, setAccounts] = useState<Account[]>([]), [error, setError] = useState(""), [busy, setBusy] = useState("");
  const load = useCallback(async () => { const response = await fetch("/api/admin/message-moderation", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Moderation status could not be loaded."); setAccounts(data.accounts || []); }, []);
  useEffect(() => { void load().catch(reason => setError(reason instanceof Error ? reason.message : "Moderation status could not be loaded.")); }, [load]);
  async function unban(userId: string) { setBusy(userId); setError(""); try { const response = await fetch("/api/admin/message-moderation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unban", userId }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Account could not be restored."); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Account could not be restored."); } finally { setBusy(""); } }
  return <section className="admin-message-moderation"><div><ShieldCheck size={18}/><div><h2>Message safety</h2><p>Repeated-message and rapid-send safeguards issue warnings. Only the owner can restore a suspended account.</p></div></div>{error && <p role="alert">{error}</p>}{accounts.length ? <div className="admin-moderation-list">{accounts.map(account => <article key={account.id}><span><strong>{account.email}</strong><small>{account.warnings} warning(s) · {account.banned_at ? `Suspended ${new Date(account.banned_at).toLocaleString()}` : "Not suspended"}</small></span>{account.banned_at && <button disabled={!!busy} onClick={() => void unban(account.id)}>{busy === account.id ? "Restoring…" : "Restore account"}</button>}</article>)}</div> : <p>No accounts have triggered a message warning.</p>}</section>;
}
