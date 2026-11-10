"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
function Result() {
  const s = useSearchParams(),
    id = s.get("payment_id");
  const [p, setP] = useState<any>(null),
    [err, setErr] = useState("");
  useEffect(() => {
    if (!id) {
      setErr("Missing payment reference");
      return;
    }
    let active = true,
      count = 0;
    const load = () =>
      fetch("/api/checkout/status?payment_id=" + encodeURIComponent(id))
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw Error(d.error);
          if (active) setP(d);
        })
        .catch((e) => {
          if (active) setErr(e.message);
        });
    load();
    const t = setInterval(() => {
      if (++count > 30) {
        clearInterval(t);
        return;
      }
      load();
    }, 2000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [id]);
  return (
    <main className="max-w-xl mx-auto p-6 py-16">
      <h1 className="text-2xl font-bold">
        {err
          ? "Unable to check payment"
          : p?.verified && p.status === "completed"
            ? "Payment confirmed"
            : p?.status === "failed"
              ? "Payment failed"
              : "Checking payment status"}
      </h1>
      {err && (
        <p role="alert" className="mt-4 text-red-600">
          {err}
        </p>
      )}
      {p && (
        <div className="mt-5 space-y-3">
          <p>
            {p.isTest
              ? "Test payment — no money moved."
              : "Payment is checked against the verified provider record."}
          </p>
          <p>
            {p.listingTitle} · ${p.amountUsd.toFixed(2)} · {p.status}
          </p>
          {p.verified && !p.approved && (
            <p>
              Your listing is awaiting admin review before appearing on the
              public board.
            </p>
          )}
          {!p.verified && (
            <p>
              A return to this page does not confirm payment. Check your
              dashboard if the provider is still processing it.
            </p>
          )}
        </div>
      )}
      <Link href="/dashboard" className="inline-block text-[#FF6B4A] mt-6">
        View my listings and payments →
      </Link>
    </main>
  );
}
export default function Success() {
  return (
    <>
      <Header />
      <Suspense fallback={<p className="p-8">Loading payment status…</p>}>
        <Result />
      </Suspense>
      <Footer />
    </>
  );
}
