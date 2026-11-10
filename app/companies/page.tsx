import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import getDb from "@/lib/db";
import { hasLogoConsent, COMPANY_SIZE_LABELS } from "@/lib/company-directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verified Companies — RankBid",
  description: "Directory of partner companies with verified consent for RankBid product listings and rankings.",
};

type ApprovedCompany = {
  id: string;
  name: string;
  domain: string;
  website_url: string;
  logo_url: string;
  size_tier: number;
  consent_scope: string;
  approved_at: string | null;
  consent_at: string | null;
};

export default function CompaniesPage() {
  const officialSiteUrl = process.env.NEXT_PUBLIC_OFFICIAL_SITE_URL || "http://localhost:3001";
  let companies: ApprovedCompany[] = [];

  try {
    const db = getDb();
    const tableExists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='partner_companies'").get();
    if (tableExists) {
      companies = db
        .prepare(
          `SELECT id, name, domain, website_url, logo_url, size_tier, consent_scope, approved_at, consent_at 
           FROM partner_companies 
           WHERE status = 'approved' AND consent_at IS NOT NULL 
           ORDER BY size_tier DESC, name COLLATE NOCASE ASC`
        )
        .all() as ApprovedCompany[];
    }
  } catch {
    companies = [];
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="mb-8 border-b border-stone-200 pb-6 dark:border-stone-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
                Verified Companies
              </h1>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                Companies participating in verified RankBid directory listings. Listings require verified owner consent.
              </p>
            </div>
            <div>
              <a
                href={`${officialSiteUrl}/consent`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-orange-500 transition-colors"
              >
                <span>Consent Portal</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>

        {companies.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-8 text-center dark:border-stone-800 dark:bg-stone-900/50">
            <h2 className="text-base font-semibold text-stone-800 dark:text-stone-200">
              No verified company listings yet
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-stone-600 dark:text-stone-400">
              Only companies with explicit, verified consent are listed in the public directory. Unconsented or pending submissions are never displayed.
            </p>
            <div className="mt-6">
              <a
                href={`${officialSiteUrl}/companies`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                <span>View Official Directory details</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => {
              const showLogo = Boolean(c.logo_url && hasLogoConsent(c.consent_scope || ""));
              return (
                <div
                  key={c.id}
                  className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-blue-500/40 dark:border-stone-800 dark:bg-stone-900"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      {showLogo ? (
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-white p-1 dark:border-stone-700 dark:bg-stone-800">
                          <img
                            src={c.logo_url}
                            alt={`${c.name} logo`}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-xs font-bold text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-semibold text-stone-900 dark:text-white">
                          {c.name}
                        </h2>
                        <p className="truncate text-xs font-mono text-stone-500 dark:text-stone-400">
                          {c.domain}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="inline-block rounded bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                        {COMPANY_SIZE_LABELS[c.size_tier] || "Partner"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs dark:border-stone-800">
                    <span className="text-[11px] text-blue-600 dark:text-blue-400">
                      ✓ Verified consent
                    </span>
                    <a
                      href={c.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
                    >
                      Visit ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
