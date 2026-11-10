"use client";

import { useState } from "react";
import { Check, Copy, Terminal, Code2, Server, ShieldCheck, Play, ArrowRight } from "lucide-react";

export default function ApiDocsGuide() {
  const [activeTab, setActiveTab] = useState<"curl" | "node" | "python">("curl");
  const [copied, setCopied] = useState<string | null>(null);

  function copyCode(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const curlExample = `curl -X POST https://rankbid-marketplacelive.vercel.app/api/analytics/events \\
  -H "Content-Type: application/json" \\
  -H "X-Site-Key: YOUR_PUBLIC_SITE_KEY" \\
  -d '{
    "path": "/products/showcase",
    "referrer": "https://google.com",
    "event_type": "pageview",
    "visitor_id": "usr_v2_9a8f102c"
  }'`;

  const nodeExample = `import fetch from "node-fetch";

// Send a verified analytics event from your server or edge handler
const response = await fetch("https://rankbid-marketplacelive.vercel.app/api/analytics/events", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Site-Key": process.env.RANKLENS_SITE_KEY!,
  },
  body: JSON.stringify({
    path: "/checkout/confirmation",
    referrer: "https://x.com",
    event_type: "pageview",
    visitor_id: "usr_v2_9a8f102c",
  }),
});

const data = await response.json();
console.log("Event recorded:", data);`;

  const pythonExample = `import os
import requests

# Send an event to RankLens Analytics
response = requests.post(
    "https://rankbid-marketplacelive.vercel.app/api/analytics/events",
    headers={
        "Content-Type": "application/json",
        "X-Site-Key": os.getenv("RANKLENS_SITE_KEY"),
    },
    json={
        "path": "/pricing",
        "referrer": "https://news.ycombinator.com",
        "event_type": "pageview",
        "visitor_id": "usr_v2_9a8f102c",
    },
    timeout=5,
)

print("Status:", response.status_code)
print("Response:", response.json())`;

  const revenueCurl = `curl -X POST https://rankbid-marketplacelive.vercel.app/api/analytics/revenue \\
  -H "Content-Type: application/json" \\
  -H "X-Site-Secret: YOUR_PRIVATE_SERVER_SECRET" \\
  -d '{
    "order_id": "pi_3NqV12...",
    "amount_cents": 4900,
    "currency": "USD",
    "provider": "stripe",
    "verified": true,
    "visitor_id": "usr_v2_9a8f102c"
  }'`;

  return (
    <div className="space-y-8 mt-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs tracking-wide uppercase">
            <Server size={14} /> Base URL
          </div>
          <div className="font-mono text-xs text-slate-200 truncate">
            https://rankbid-marketplacelive.vercel.app
          </div>
          <p className="text-[11px] text-slate-400">All API endpoints are served over strict HTTPS.</p>
        </div>

        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wide uppercase">
            <ShieldCheck size={14} /> Authentication
          </div>
          <div className="font-mono text-xs text-slate-200">
            Header: X-Site-Key
          </div>
          <p className="text-[11px] text-slate-400">Scoped per website created in your dashboard.</p>
        </div>

        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wide uppercase">
            <Terminal size={14} /> Response Format
          </div>
          <div className="font-mono text-xs text-slate-200">
            application/json
          </div>
          <p className="text-[11px] text-slate-400">Standard status codes with structured error payloads.</p>
        </div>
      </div>

      {/* Code Snippets Section */}
      <section className="rounded-2xl border border-slate-700/80 bg-slate-950 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-sky-400" />
            <span className="text-xs font-semibold text-white tracking-wide">
              ENDPOINT: POST /api/analytics/events
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {(["curl", "node", "python"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === tab
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab === "curl" ? "cURL" : tab === "node" ? "Node.js" : "Python"}
              </button>
            ))}
          </div>
        </div>

        <div className="relative p-5">
          <button
            type="button"
            onClick={() =>
              copyCode(
                "eventCode",
                activeTab === "curl"
                  ? curlExample
                  : activeTab === "node"
                  ? nodeExample
                  : pythonExample
              )
            }
            className="absolute top-4 right-4 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {copied === "eventCode" ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>

          <pre className="font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
            <code>
              {activeTab === "curl" && curlExample}
              {activeTab === "node" && nodeExample}
              {activeTab === "python" && pythonExample}
            </code>
          </pre>
        </div>
      </section>

      {/* Revenue Event Guide */}
      <section className="rounded-2xl border border-slate-700/80 bg-slate-950 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white tracking-wide">
              SERVER REVENUE ATTRIBUTION: POST /api/analytics/revenue
            </span>
          </div>

          <button
            type="button"
            onClick={() => copyCode("revenueCode", revenueCurl)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {copied === "revenueCode" ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs text-slate-400 mb-3">
            Send this event exclusively from your backend server webhook listener after Stripe or Razorpay completes capture.
          </p>
          <pre className="font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
            <code>{revenueCurl}</code>
          </pre>
        </div>
      </section>

      {/* Response Status Codes Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white tracking-tight">HTTP Status Codes & Error Handling</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Status Code</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">200 OK</td>
                <td className="py-2.5 px-3">Event was accepted and recorded in the analytics store.</td>
                <td className="py-2.5 px-3 text-slate-400">No action needed.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-amber-400">400 Bad Request</td>
                <td className="py-2.5 px-3">Malformed JSON payload, invalid visitor identifier, or missing fields.</td>
                <td className="py-2.5 px-3 text-slate-400">Verify request body matches schema.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-rose-400">401 Unauthorized</td>
                <td className="py-2.5 px-3">Missing or invalid X-Site-Key or X-Site-Secret header.</td>
                <td className="py-2.5 px-3 text-slate-400">Check key in your RankLens dashboard settings.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-purple-400">429 Rate Limited</td>
                <td className="py-2.5 px-3">Too many requests from the same client within 60 seconds.</td>
                <td className="py-2.5 px-3 text-slate-400">Batch requests or implement exponential backoff.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
