"use client";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
export function Moderate({
  id,
  approved,
  active,
}: {
  id: number;
  approved: boolean;
  active: boolean;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function change(body: any) {
    setBusy(true);
    try {
      const r = await fetch("/api/products/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      window.location.reload();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <div className="flex gap-3 text-sm flex-wrap">
      <button
        disabled={busy}
        className="underline"
        onClick={() => change({ is_approved: approved ? 0 : 1 })}
      >
        {approved ? "Unapprove" : "Approve"}
      </button>
      <button
        disabled={busy}
        className="underline"
        onClick={() => change({ is_active: active ? 0 : 1 })}
      >
        {active ? "Hide" : "Restore"}
      </button>
      {error && (
        <span role="alert" className="text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
export function SettingsForm() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/admin/settings")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setSettings(d);
      })
      .catch((e) => setMessage(e.message));
  }, []);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = Object.fromEntries(new FormData(e.currentTarget));
      const r = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage(
        "Settings saved. Plan prices, durations and placement markups apply to new checkouts.",
      );
    } catch (e: any) {
      setMessage(e.message);
    }
    setBusy(false);
  }
  return (
    <div className="max-w-xl">
      {settings && (
        <form onSubmit={save} className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100"><strong>RankLens plan controls</strong><p className="mt-1">Set each plan’s subscription price, default duration and RankBid placement markup. Markup is applied to a customer’s future placement bids while their paid plan is active. Saving only affects new checkouts; it does not charge customers or grant access.</p></div>
          {Object.entries(settings).map(([k, v]) => (
            <label key={k} className="block capitalize">
              {({ analytics_plan_day_price: "Day pass price (USD)", analytics_plan_monthly_price: "Monthly plan price (USD)", analytics_plan_yearly_price: "Yearly plan price (USD)", analytics_plan_day_days: "Day pass default duration (days)", analytics_plan_monthly_days: "Monthly plan default duration (days)", analytics_plan_yearly_days: "Yearly plan default duration (days)", analytics_plan_day_markup_percent: "Day pass placement markup (%)", analytics_plan_monthly_markup_percent: "Monthly plan placement markup (%)", analytics_plan_yearly_markup_percent: "Yearly plan placement markup (%)" } as Record<string, string>)[k] ?? k.replaceAll("_", " ")}
              <input
                name={k}
                defaultValue={v}
                required
                type={(["min_bid", "min_increment", "top_bonus", "analytics_plan_day_price", "analytics_plan_monthly_price", "analytics_plan_yearly_price", "analytics_plan_day_days", "analytics_plan_monthly_days", "analytics_plan_yearly_days", "analytics_plan_day_markup_percent", "analytics_plan_monthly_markup_percent", "analytics_plan_yearly_markup_percent"].includes(k)) ? "number" : "text"}
                min={k.endsWith("_price") ? "0.01" : k.endsWith("_markup_percent") ? "0" : "1"}
                max={k.endsWith("_markup_percent") ? "100" : k.endsWith("_days") ? "3660" : undefined}
                maxLength={200}
                step={k.endsWith("_price") ? "0.01" : "1"}
                className="block border p-3 rounded-lg w-full mt-1 bg-transparent"
              />
            </label>
          ))}
          <button
            disabled={busy}
            className="bg-[#FF6B4A] text-white p-3 rounded-lg"
          >
            {busy ? "Saving…" : "Save settings"}
          </button>
        </form>
      )}
      {message && (
        <p role="status" className="mt-4">
          {message}
        </p>
      )}
      <p className="mt-6 text-sm text-gray-500">
        Configure Stripe keys in the server environment. Link your bank account
        and complete merchant verification in the payment provider dashboard.
        This website does not configure bank payouts.
      </p>
    </div>
  );
}

export function AdminPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (newPassword !== confirmPassword) { setMessage("The new passwords do not match."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The password could not be changed.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setMessage("Password changed. Other sessions for this account have been signed out.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The password could not be changed."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="mt-8 max-w-xl space-y-4 rounded-xl border p-5 dark:border-gray-800">
    <div><h2 className="font-semibold">Change your password</h2><p className="mt-1 text-sm text-gray-500">Confirm your current password. Other sessions will be signed out after the change.</p></div>
    <label className="block text-sm">Current password<input required autoComplete="current-password" type={visible ? "text" : "password"} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="mt-1 block w-full rounded-lg border bg-transparent p-3 dark:border-gray-700" /></label>
    <label className="block text-sm">New password<span className="relative mt-1 block"><input required minLength={12} maxLength={256} autoComplete="new-password" type={visible ? "text" : "password"} value={newPassword} onChange={event => setNewPassword(event.target.value)} className="block w-full rounded-lg border bg-transparent p-3 pr-12 dark:border-gray-700"/><button type="button" aria-label={visible ? "Hide passwords" : "Show passwords"} onClick={() => setVisible(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span><span className="mt-1 block text-xs text-gray-500">Use 12 to 256 characters.</span></label>
    <label className="block text-sm">Confirm new password<input required minLength={12} maxLength={256} autoComplete="new-password" type={visible ? "text" : "password"} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-1 block w-full rounded-lg border bg-transparent p-3 dark:border-gray-700" /></label>
    <button disabled={busy} className="rounded-lg bg-[#F2663A] px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Updating…" : "Update password"}</button>
    {message && <p role="status" className="text-sm text-gray-600 dark:text-gray-300">{message}</p>}
  </form>;
}
