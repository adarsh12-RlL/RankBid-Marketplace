"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Lock,
} from "lucide-react";
import Link from "next/link";

function SandboxCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get("payment_id");

  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!paymentId) {
      setError("Missing payment identifier");
      setLoading(false);
      return;
    }

    fetch(`/api/checkout/status?payment_id=${paymentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPaymentData(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [paymentId]);

  const handleSimulatePayment = async (action: "succeed" | "fail") => {
    setProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/sandbox/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to simulate payment");
      }

      if (action === "succeed") {
        router.push(`/checkout/success?payment_id=${paymentId}`);
      } else {
        router.push(`/checkout/cancel?payment_id=${paymentId}`);
      }
    } catch (err: any) {
      setError(err.message);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            Preparing Secure Sandbox Checkout...
          </p>
        </div>
      </div>
    );
  }

  if (error || !paymentData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Checkout Error
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {error || "Unable to load payment details"}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-500"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Leaderboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-lg w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Developer Sandbox / Test Mode</span>
          </div>
          <span className="text-[11px] font-mono text-gray-400 bg-white/60 dark:bg-gray-800 px-2 py-0.5 rounded">
            ID: {String(paymentData.id).slice(0, 12)}...
          </span>
        </div>

        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              Complete Placement Payment
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Confirm your bid placement on RankBid
            </p>
          </div>

          {/* Order Summary Box */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6 space-y-3 text-sm">
            <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
              <span>Target Product:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {paymentData.listingTitle}
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
              <span>Domain:</span>
              <span className="font-mono text-xs text-gray-500">
                {paymentData.listingDomain}
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
              <span>Target Leaderboard:</span>
              <span className="font-semibold text-orange-600 uppercase text-xs">
                {paymentData.targetBoard === "today"
                  ? "Today's Board"
                  : "All-Time Board"}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <span className="font-bold text-base text-gray-900 dark:text-white">
                  Total Amount Due
                </span>
                <p className="text-[11px] text-gray-500">
                  Calculated difference (No double-charging)
                </p>
              </div>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ${paymentData.amountUsd.toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* Test Card Simulator Notice */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl mb-6 text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Zero-Budget Sandbox Simulation
            </p>
            <p>
              In sandbox mode, you can test payment status changes and ranking
              calculations without spending real money.
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 pt-1">
              * Payment processor transaction fees apply to live card charges
              and depend on the provider and merchant account. Paid placement
              does not guarantee traffic or revenue.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleSimulatePayment("succeed")}
              disabled={processing}
              className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Test Payment...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>
                    Simulate Successful Payment ($
                    {paymentData.amountUsd.toFixed(2)})
                  </span>
                </>
              )}
            </button>

            <button
              onClick={() => handleSimulatePayment("fail")}
              disabled={processing}
              className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-xs transition-colors"
            >
              Simulate Card Declined (Test Failure)
            </button>
          </div>

          <div className="text-center mt-6">
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Cancel and return to leaderboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SandboxCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
          <div className="text-center text-sm text-gray-400">
            Loading Sandbox Checkout...
          </div>
        </div>
      }
    >
      <SandboxCheckoutContent />
    </Suspense>
  );
}
