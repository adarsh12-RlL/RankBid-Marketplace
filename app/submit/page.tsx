"use client";

import { Suspense, useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import Link from "next/link";

import Header from "@/components/Header";

import Footer from "@/components/Footer";

import { CATEGORIES } from "@/lib/utils";

import { normalizeListingUrl } from "@/lib/listing-identity";

function Submit() {

  const s = useSearchParams(),

    board = (s.get("board") || s.get("targetBoard")) === "today" ? "today" : "all_time";

  const [user, setUser] = useState<any>(undefined),

    [info, setInfo] = useState<any>(null),

    [mine, setMine] = useState<any[]>([]),

    [id, setId] = useState(s.get("productId") || s.get("listingId") || ""),

    [target, setTarget] = useState(Math.min(999999, Math.max(1, Number(s.get("price") || s.get("targetAmount")) || 1))),

    [error, setError] = useState(""),

    [busy, setBusy] = useState(false),
    [gateway,setGateway] = useState("stripe");

  useEffect(() => {

    fetch("/api/auth/me")

      .then((r) => r.ok ? r.json() : { user: null })

      .then((d) => setUser(d.user || null))

      .catch(() => setUser(null));

    fetch("/api/payment/info")

      .then((r) => r.json())

      .then((d)=>{setInfo(d);const first=d.gateways?.find((g:any)=>g.enabled);if(first)setGateway(first.id);})

      .catch(() => setError("Unable to load payment settings. Please reload."));

    fetch("/api/account/products")

      .then((r) => (r.ok ? r.json() : { products: [] }))

      .then((d) => setMine(d.products || []))

      .catch(() => {});

  }, []);

  const current = mine.find((p) => String(p.id) === id);
  const hasEnabledGateway = Boolean(info?.gateways?.some((g: any) => g.enabled));
  const selectedGatewayEnabled = Boolean(info?.gateways?.some((g: any) => g.id === gateway && g.enabled));
  const paymentSetupNeeded = Boolean(info && (info.mode === "disabled" || info.checkoutEnabled === false || !hasEnabledGateway));
  const placementMarkupPercent = user?.role === "admin" ? 0 : Math.max(0, Math.min(100, Number(info?.placementMarkup) || 0));

  const cents = current

    ? board === "today"

      ? current.todayCents

      : current.allTimeCents

    : 0;

  async function submit(e: React.FormEvent<HTMLFormElement>) {

    e.preventDefault();

    setError("");

    setBusy(true);

    const fd = new FormData(e.currentTarget);

    try {

      if (!Number.isSafeInteger(target) || target < (id ? 1 : Math.max(1, info?.minBid || 1)) || target > 999999)

        throw Error("Choose a whole-dollar target up to $999,999.");

      const productUrl = id ? undefined : normalizeListingUrl(String(fd.get("url") || "")).url;

      const r = await fetch("/api/checkout/session", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          name: fd.get("name"),

          url: productUrl,

          description: fd.get("description"),

          category: fd.get("category"),

          productId: id ? Number(id) : undefined,

          gateway,
          targetBoard: board,

          targetAmountCents: target * 100,

          acceptedTerms: fd.get("acceptedTerms") === "on",

          authorized: fd.get("authorized") === "on",

        }),

      });

      const d = await r.json();

      if (!r.ok) throw Error(d.error || "Checkout failed");

      const checkoutUrl = d.checkoutUrl || d.url;

      if (typeof checkoutUrl !== "string" || !checkoutUrl) throw Error("The server did not return a checkout URL.");

      const destination = new URL(checkoutUrl, window.location.origin);

      if (!["http:", "https:"].includes(destination.protocol) ||

          (destination.protocol !== "https:" && destination.origin !== window.location.origin))

        throw Error("The checkout URL is invalid.");

      window.location.assign(destination.toString());

    } catch (e: any) {

      setError(e.message);

      setBusy(false);

    }

  }

  return (

    <main className="max-w-xl mx-auto px-4 py-10">

      <button
        type="button"
        className="rankbid-back-button"
        aria-label="Go back to the previous page"
        onClick={() => {
          if (window.history.length > 1) window.history.back();
          else window.location.assign("/");
        }}
      >
        <span aria-hidden="true">←</span> Back
      </button>

      <h1 className="text-3xl font-bold mb-3">Claim your placement</h1>

      <p className="text-sm text-gray-500 mb-6">

        {board === "today" ? "Today's" : "All-time"} board · USD · Rank is not

        reserved at checkout.

      </p>

      {user === undefined ? (

        <p>Checking your account…</p>

      ) : !user ? (

        <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">

          <p>Sign in to manage your own products and payments.</p>

          <Link

            href={

              "/login?next=" + encodeURIComponent("/submit?" + s.toString())

            }

            className="text-[#FF6B4A] inline-block mt-4"

          >

            Sign in or create an account →

          </Link>

        </div>

      ) : (

        <form onSubmit={submit} className="space-y-5">

          {info && (
            <div
              id="checkout-status-details"
              role="status"
              aria-live="polite"
              className={`checkout-status-note ${paymentSetupNeeded ? "is-unavailable" : info.isTest ? "is-test" : "is-live"}`}
            >
              <strong>{paymentSetupNeeded ? "Checkout is unavailable" : info.isTest ? "Test payment mode" : "Live payment mode"}</strong>
              <p>
                {paymentSetupNeeded
                  ? "The owner has not finished payment setup. A payment provider, webhook, and currency pricing must be configured before checkout can work. No payment will be charged yet."
                  : info.isTest
                    ? "This is a test checkout. No real money will move."
                    : "Payments are processed by the selected provider. Provider fees and applicable taxes may apply."}
              </p>
            </div>
          )}

          <fieldset className="space-y-3"><legend className="font-semibold text-sm mb-2">Choose your payment gateway</legend>{(info?.gateways||[]).map((g:any)=><label key={g.id} className={"flex items-start gap-3 rounded-xl border p-4 "+(gateway===g.id?"border-[#e87655] bg-[#fff7f1] dark:bg-stone-900":"border-stone-200 dark:border-stone-700")+(g.enabled?" cursor-pointer":" checkout-gateway-disabled")}><input type="radio" name="gateway" value={g.id} checked={gateway===g.id} disabled={!g.enabled} onChange={()=>setGateway(g.id)} className="mt-1"/><span><b className="text-sm">{g.name}</b><span className="text-xs ml-2 text-stone-500">{g.currency}</span><small className="block mt-1 text-xs text-stone-500 leading-5">{g.description}</small></span></label>)}</fieldset>
<label className="block">

            Product

            <select

              value={id}

              onChange={(e) => setId(e.target.value)}

              className="block w-full border p-3 rounded-lg bg-white dark:bg-gray-900 mt-1"

            >

              <option value="">Submit a new product</option>

              {mine.map((p) => (

                <option key={p.id} value={p.id}>

                  {p.name} ({p.domain})

                </option>

              ))}

            </select>

          </label>

          {!id && (

            <>

              <label className="block">

                Product name

                <input

                  name="name"

                  defaultValue={s.get("name") || ""}

                  required

                  maxLength={100}

                  className="block w-full border p-3 rounded-lg bg-transparent mt-1"

                />

              </label>

              <label className="block">

                Website URL

                <input

                  name="url"

                  type="text"

                  inputMode="url"

                  defaultValue={s.get("url") || ""}

                  required

                  placeholder="https://your-product.com"

                  maxLength={2048}

                  className="block w-full border p-3 rounded-lg bg-transparent mt-1"

                />

              </label>

              <label className="block">

                Short description

                <textarea

                  name="description"

                  defaultValue={s.get("description") || ""}

                  required

                  maxLength={500}

                  rows={3}

                  className="block w-full border p-3 rounded-lg bg-transparent mt-1"

                />

              </label>

              <label className="block">

                Category

                <select

                  name="category"

                  defaultValue={

                    CATEGORIES.includes(s.get("category") || "")

                      ? s.get("category")!

                      : "Other"

                  }

                  className="block w-full border p-3 rounded-lg bg-white dark:bg-gray-900 mt-1"

                >

                  {CATEGORIES.filter((c) => c !== "All" && c !== "Explore").map((c) => (

                    <option key={c}>{c}</option>

                  ))}

                </select>

              </label>

            </>

          )}

          <label className="block">

            Target total on this board (USD)

            <input

              type="number"

              min={

                id

                  ? cents / 100 + (info?.minIncrement || 1)

                  : Math.max(1, info?.minBid || 1)

              }

              max={999999}

              step="1"

              required

              value={target}

              onChange={(e) => setTarget(Number(e.target.value))}

              className="block w-full border p-3 rounded-lg bg-transparent mt-1"

            />

          </label>

          <div className="text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">

            Current confirmed total: ${(cents / 100).toFixed(2)}

            <br />

            Base amount due: ${(Math.max(0, target * 100 - cents) / 100).toFixed(2)}

            {placementMarkupPercent > 0 && <>
              <br />
              <span>Active RankLens Pro placement markup ({placementMarkupPercent}%): +${(Math.ceil(Math.max(0, target * 100 - cents) * placementMarkupPercent / 100) / 100).toFixed(2)}</span>
            </>}

            <br />

            <strong>

              Estimated amount due: $

              {((Math.max(0, target * 100 - cents) + Math.ceil(Math.max(0, target * 100 - cents) * placementMarkupPercent / 100)) / 100).toFixed(2)}

            </strong>

            {placementMarkupPercent > 0 && <p className="text-gray-500 mt-1">The markup is charged only while your paid RankLens Pro period is active. The leaderboard records the verified amount charged.</p>}

            <p className="text-gray-500 mt-2">

              The server recalculates the final charge. Placement appears after

              verified payment. The operator may review or remove listings that violate the rules.

            </p>

          </div>

          <label className="flex gap-3 text-sm">

            <input

              name="authorized"

              type="checkbox"

              required

              className="mt-1"

            />

            <span>I own this product or am authorized to represent it.</span>

          </label>

          <label className="flex gap-3 text-sm">

            <input

              name="acceptedTerms"

              type="checkbox"

              required

              className="mt-1"

            />

            <span>

              I accept the{" "}

              <Link href="/terms" className="underline">

                placement terms

              </Link>

              . Other users can outrank me; traffic and sales are not

              guaranteed.

            </span>

          </label>

          {error && (

            <p role="alert" className="text-red-600">

              {error}

            </p>

          )}

          <button

            disabled={busy || !info || (info.mode === "disabled" || info.checkoutEnabled === false) || !info.gateways?.some((g:any)=>g.id===gateway&&g.enabled)}

            aria-describedby={paymentSetupNeeded ? "checkout-status-details" : undefined}

            className="checkout-submit-button bg-[#FF6B4A] text-white w-full p-3 rounded-lg font-medium disabled:opacity-50"

          >

            {busy

              ? "Creating checkout…"

              : !info || info.mode === "disabled" || info.checkoutEnabled === false || !selectedGatewayEnabled
                ? "Payment setup required"
                : "Continue to " + (info.isTest ? "test " : "") + "checkout"}

          </button>

        </form>

      )}

    </main>

  );

}

export default function SubmitPage() {

  return (

    <>

      <Header />

      <Suspense fallback={<p className="p-8">Loading submission…</p>}>

        <Submit />

      </Suspense>

      <Footer />

    </>

  );

}

