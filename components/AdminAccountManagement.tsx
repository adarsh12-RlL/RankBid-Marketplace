"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";

type AdminAccount = { id: string; email: string; created_at: string; is_active: number };

export default function AdminAccountManagement() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setBusy("loading"); setError("");
    try {
      const response = await fetch("/api/admin/admins", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Admin accounts could not be loaded.");
      setAdmins(data.admins || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Admin accounts could not be loaded."); }
    finally { setBusy(""); }
  }

  useEffect(() => { void load(); }, []);

  async function send(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
    setBusy(typeof body.id === "string" ? body.id : "form"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/admins", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The admin account could not be updated.");
      setNotice(method === "POST" ? "Admin account created." : method === "DELETE" ? "Admin account deleted." : "Admin account updated.");
      if (method === "POST") { setEmail(""); setPassword(""); }
      if (body.action === "reset-password" && typeof body.id === "string")
        setResetPasswords(current => ({ ...current, [body.id as string]: "" }));
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The admin account could not be updated."); }
    finally { setBusy(""); }
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); void send("POST", { email, password });
  }

  return <section className="my-8 space-y-6" aria-labelledby="admin-accounts-heading">
    <header className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-blue-500/15 p-3 text-blue-300"><ShieldCheck size={22}/></span>
        <div><h2 id="admin-accounts-heading" className="text-xl font-semibold">Administrator accounts</h2>
          <p className="mt-1 text-sm text-slate-300">Only the owner can view and manage normal admin accounts. Customer accounts are not listed here.</p>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg border border-blue-500/40 bg-blue-950/30 p-3 text-sm text-blue-100">{notice}</p>}
    </header>

    <form onSubmit={create} className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-5 sm:p-6">
      <div><h3 className="font-semibold">Create a normal admin</h3><p className="mt-1 text-sm text-slate-400">Use a unique email and a strong password with at least 12 characters.</p></div>
      <label className="block text-sm">Admin email<input required type="email" maxLength={254} autoComplete="off" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-3" /></label>
      <label className="block text-sm">Temporary password<span className="relative mt-1 block"><input required minLength={12} maxLength={256} autoComplete="new-password" type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} className="block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-3 pr-12"/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></label>
      <button disabled={busy === "form"} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#F2663A] px-4 py-2 font-semibold text-white disabled:opacity-50"><UserPlus size={17}/>{busy === "form" ? "Creating…" : "Create admin"}</button>
    </form>

    <section className="space-y-3" aria-label="Normal admin accounts">
      <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Normal admins</h3><button type="button" onClick={() => void load()} disabled={!!busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm"><RefreshCw size={15} className={busy === "loading" ? "animate-spin" : ""}/>Refresh</button></div>
      {!admins.length && !busy ? <p className="rounded-xl border border-slate-700 p-5 text-sm text-slate-400">No normal admin accounts have been added.</p> : admins.map(admin => {
        const active = admin.is_active === 1;
        return <article key={admin.id} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><p className="break-all font-medium">{admin.email}</p><p className="mt-1 text-xs text-slate-400">Admin ID: <span className="break-all">{admin.id}</span> · Added {new Date(admin.created_at).toLocaleDateString()}</p></div>
            <span className={`w-fit rounded-full border px-3 py-1 text-xs ${active ? "border-blue-400/40 text-blue-200" : "border-orange-400/40 text-orange-200"}`}>{active ? "Enabled" : "Disabled"}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <input aria-label={`New password for ${admin.email}`} type="password" autoComplete="new-password" minLength={12} maxLength={256} placeholder="New password (12+ characters)" value={resetPasswords[admin.id] || ""} onChange={event => setResetPasswords(current => ({ ...current, [admin.id]: event.target.value }))} className="min-w-0 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm"/>
            <button type="button" disabled={!!busy || (resetPasswords[admin.id] || "").length < 12} onClick={() => void send("PATCH", { action: "reset-password", id: admin.id, password: resetPasswords[admin.id] })} className="rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-40">Reset password</button>
            <button type="button" disabled={!!busy} onClick={() => void send("PATCH", { action: "set-active", id: admin.id, enabled: !active })} className="rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-40">{active ? "Disable" : "Enable"}</button>
            <button type="button" disabled={!!busy} onClick={() => { if (window.confirm(`Delete the admin account ${admin.email}? This is permanent.`)) void send("DELETE", { id: admin.id }); }} className="rounded-lg border border-orange-400/50 px-3 py-2 text-sm text-orange-200 disabled:opacity-40">Delete</button>
          </div>
        </article>;
      })}
    </section>
  </section>;
}
