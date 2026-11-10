"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type UserRow = { id: string; email: string; role: string; expires_at: string | null; updated_at: string | null; granted_by_email: string | null };
type PlanRequest = {id:string;user_id:string;email:string;plan_id:string;amount_cents:number;duration_days:number;currency:string;status:string;requested_at:string};

function dateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function AdminAnalyticsPlanAccess() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [requests,setRequests]=useState<PlanRequest[]>([]);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const customerUsers = users.filter(user => user.role !== "admin");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/analytics-plan", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Customer plans could not be loaded.");
      setUsers(data.users || []);setRequests(data.requests||[]);
      setDates(current => Object.fromEntries((data.users || []).map((user: UserRow) => [user.id, current[user.id] || dateInputValue(new Date(Date.now() + 30 * 86400000))])));
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Customer plans could not be loaded."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function update(userId: string, action: "activate" | "revoke") {
    setBusyId(userId); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/analytics-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, expiresAt: action === "activate" ? new Date(dates[userId] + "T23:59:59").toISOString() : undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Plan access could not be updated.");
      setNotice(action === "activate" ? "Bot traffic access activated after payment verification." : "Bot traffic access revoked. The previous token is no longer valid.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Plan access could not be updated."); }
    finally { setBusyId(""); }
  }

  async function reviewRequest(requestId:string,action:"approve-request"|"reject-request"){
    if(action==="approve-request"&&!window.confirm("Have you verified the captured subscription payment in the payment provider dashboard? Approving will activate the selected plan."))return;
    setBusyId(requestId);setError("");setNotice("");
    try{const response=await fetch("/api/admin/analytics-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,requestId})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Plan request could not be reviewed.");setNotice(action==="approve-request"?"Verified plan request approved and access activated.":"Plan request rejected.");await load();}
    catch(cause){setError(cause instanceof Error?cause.message:"Plan request could not be reviewed.");}finally{setBusyId("");}
  }

  return <section className="my-8 space-y-4" aria-labelledby="analytics-plan-access-title">
    <div><h2 id="analytics-plan-access-title" className="text-lg font-semibold">RankLens premium plan access</h2><p className="text-sm text-gray-500 mt-1">Subscription checkout is not connected. Check for a real captured payment in the provider dashboard before approving a request. Approval activates bot reports, CSV export, multi-site access and private owner support for the requested term. Admin accounts keep access.</p></div>
    {error && <p role="alert" className="rounded-lg border border-red-300 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-blue-300 p-3 text-sm">{notice}</p>}
    {!loading&&<div className="space-y-3"><h3 className="font-semibold">Pending customer plan requests</h3>{requests.length?requests.map(request=><article key={request.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium break-all">{request.email}</p><p className="text-sm text-gray-500">{request.plan_id} · {request.duration_days} days · ${(request.amount_cents/100).toFixed(2)} {request.currency} · requested {new Date(request.requested_at).toLocaleString()}</p><p className="mt-1 text-xs text-amber-700 dark:text-amber-400">This request is not a payment. Verify an actual captured payment in the provider dashboard before approving.</p></div><div className="flex gap-2"><button type="button" onClick={()=>void reviewRequest(request.id,"approve-request")} disabled={!!busyId} className="rounded-lg bg-[#247DB5] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{busyId===request.id?"Saving…":"Approve verified payment"}</button><button type="button" onClick={()=>void reviewRequest(request.id,"reject-request")} disabled={!!busyId} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">Reject</button></div></article>):<p className="text-sm text-gray-500">No pending plan requests.</p>}</div>}
    {loading ? <p className="text-sm text-gray-500">Loading customer accounts…</p> : customerUsers.length ? <div className="space-y-3">{customerUsers.map(user => {
      const active = !!user.expires_at && new Date(user.expires_at).getTime() > Date.now();
      return <article key={user.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="font-medium break-all">{user.email}</p><p className="text-sm text-gray-500">{active ? `Active until ${new Date(user.expires_at!).toLocaleDateString()}` : "No active paid access"}{user.granted_by_email ? ` · verified by ${user.granted_by_email}` : ""}</p></div>
        <div className="flex flex-wrap items-center gap-2"><input aria-label={`Access expiry for ${user.email}`} type="date" min={dateInputValue(new Date(Date.now() + 86400000))} max={dateInputValue(new Date(Date.now() + 367 * 86400000))} value={dates[user.id] || ""} onChange={event => setDates(current => ({ ...current, [user.id]: event.target.value }))} className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700"/><button type="button" onClick={() => void update(user.id, "activate")} disabled={busyId === user.id || !dates[user.id]} className="rounded-lg bg-[#247DB5] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{busyId === user.id ? "Saving…" : "Activate paid access"}</button>{active && <button type="button" onClick={() => void update(user.id, "revoke")} disabled={busyId === user.id} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">Revoke</button>}</div>
      </article>;
    })}</div> : <p className="text-sm text-gray-500">There are no customer accounts yet.</p>}
    <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/>Refresh customers</button>
  </section>;
}
