import { NextResponse } from "next/server";
import getDb from "@/lib/db";
import { getPaymentMode, isTestMode } from "@/lib/ranking";
import { hasLogoConsent } from "@/lib/company-directory";
import { getPublicActivity } from "@/lib/public-activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const at = new Date().toISOString();

  try {
    const db = getDb();
    const now = new Date();
    const since = new Date(now.getTime() - 5 * 60_000).toISOString();

    let live = false;
    try {
      const paymentMode = getPaymentMode();
      live = paymentMode === "live" && !isTestMode();
    } catch {
      live = false;
    }

    // 1. Members Section
    let membersSection = { available: false, count: null as number | null, reason: "Query unexecuted" };
    try {
      const row = db.prepare(`SELECT COUNT(*) AS total FROM users WHERE role='user' AND lower(email) NOT LIKE '%@rankbid.test'`).get() as { total: number };
      if (row && typeof row.total === "number") {
        membersSection = { available: true, count: Number(row.total), reason: "" };
      } else {
        membersSection = { available: false, count: null, reason: "No member record returned" };
      }
    } catch {
      membersSection = { available: false, count: null, reason: "Members query failed" };
    }

    // 2. Online Members Presence Section
    let onlineSection = { available: false, count: null as number | null, reason: "Query unexecuted" };
    try {
      const online = db.prepare(`SELECT COUNT(*) AS total FROM member_presence p JOIN users u ON u.id=p.user_id WHERE u.role='user' AND lower(u.email) NOT LIKE '%@rankbid.test' AND julianday(p.last_seen_at)>julianday(?) AND julianday(p.last_seen_at)<=julianday(?) AND EXISTS(SELECT 1 FROM sessions s WHERE s.user_id=u.id AND julianday(s.expires_at)>julianday(?))`)
        .get(since, at, at) as { total: number };
      if (online && typeof online.total === "number") {
        onlineSection = { available: true, count: Number(online.total), reason: "" };
      } else {
        onlineSection = { available: false, count: null, reason: "Online query returned no result" };
      }
    } catch {
      onlineSection = { available: false, count: null, reason: "Online presence query failed" };
    }

    // 3. Connected Websites Section
    let websitesSection = { available: false, count: null as number | null, reason: "Query unexecuted" };
    try {
      const siteTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='analytics_sites'").get();
      if (siteTable) {
        const row = db.prepare(`SELECT COUNT(*) AS total FROM analytics_sites s JOIN users u ON u.id=s.owner_id WHERE u.role='user' AND lower(u.email) NOT LIKE '%@rankbid.test'`).get() as { total: number };
        websitesSection = { available: true, count: Number(row?.total || 0), reason: "" };
      } else {
        websitesSection = { available: false, count: null, reason: "Analytics sites table not mounted" };
      }
    } catch {
      websitesSection = { available: false, count: null, reason: "Connected websites query failed" };
    }

    // 4. Verified Spend Section (Never include sandbox/test payments)
    let spendSection = { available: false, cents: null as number | null, reason: "Live payment mode not active" };
    if (live) {
      try {
        const spendRow = db.prepare(`SELECT COALESCE(SUM(amount_cents - refunded_cents), 0) AS total FROM payments WHERE verified = 1 AND status = 'completed' AND confirmed_at IS NOT NULL AND is_test = 0`).get() as { total: number };
        spendSection = { available: true, cents: Number(spendRow?.total || 0), reason: "" };
      } catch {
        spendSection = { available: false, cents: null, reason: "Spend query failed" };
      }
    } else {
      spendSection = { available: false, cents: null, reason: "RankBid is in test payment mode. Test payments are excluded from verified spend." };
    }

    // 5. Leaderboard / Rankings Section
    let rankingsSection = { available: false, count: 0, items: [] as any[], reason: "" };
    if (live) {
      try {
        const topRows = db.prepare(`SELECT p.id, p.name, p.description, p.url, p.domain, p.category, p.favicon_url, p.click_count,
          COALESCE(SUM(pay.amount_cents - pay.refunded_cents), 0) AS net_cents
          FROM products p
          LEFT JOIN payments pay ON pay.product_id = p.id AND pay.verified = 1 AND pay.status = 'completed' AND pay.confirmed_at IS NOT NULL AND pay.is_test = 0
          WHERE p.is_active = 1 AND p.is_approved = 1 AND p.review_state = 'published'
          GROUP BY p.id
          HAVING net_cents > 0
          ORDER BY net_cents DESC, p.click_count DESC, p.name COLLATE NOCASE ASC
          LIMIT 10`).all() as any[];

        const topTen = topRows.map((row, index) => ({
          rank: index + 1,
          name: String(row.name || "Product"),
          description: String(row.description || ""),
          url: String(row.url || ""),
          domain: String(row.domain || ""),
          category: String(row.category || "General"),
          logoUrl: String(row.favicon_url || ""),
          clicks: Number(row.click_count || 0),
          verifiedSpendCents: Number(row.net_cents || 0),
        }));
        rankingsSection = { available: true, count: topTen.length, items: topTen, reason: "" };
      } catch {
        rankingsSection = { available: false, count: 0, items: [], reason: "Leaderboard query failed" };
      }
    } else {
      rankingsSection = { available: false, count: 0, items: [], reason: "Leaderboard shows verified live payments. Test mode bids excluded." };
    }

    // 6. Company Directory Section
    let companyDirectorySection = { available: false, count: 0, items: [] as any[], reason: "" };
    try {
      const companyTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='partner_companies'").get();
      if (companyTable) {
        const rows = db.prepare(`SELECT name, domain, website_url, logo_url, consent_scope, size_tier FROM partner_companies WHERE status='approved' AND consent_at IS NOT NULL ORDER BY size_tier DESC, name COLLATE NOCASE ASC`).all() as any[];
        const companies = rows
          .filter((row) => !row.logo_url || hasLogoConsent(String(row.consent_scope || "")))
          .map((row) => ({
            name: String(row.name),
            domain: String(row.domain),
            websiteUrl: String(row.website_url),
            logoUrl: row.logo_url && hasLogoConsent(String(row.consent_scope || "")) ? String(row.logo_url) : "",
            sizeTier: Number(row.size_tier || 0),
          }));
        companyDirectorySection = { available: true, count: companies.length, items: companies, reason: "" };
      } else {
        companyDirectorySection = { available: false, count: 0, items: [], reason: "Partner companies table not mounted" };
      }
    } catch {
      companyDirectorySection = { available: false, count: 0, items: [], reason: "Company directory query failed" };
    }

    // 7. Recent Activity Section
    let activitySection = { available: false, count: 0, items: [] as any[], reason: "" };
    try {
      const paymentMode = getPaymentMode();
      const activityRes = getPublicActivity({ limit: 10 }, {
        db,
        mode: paymentMode,
        isTest: isTestMode(),
        asOf: at,
      });
      activitySection = { available: true, count: activityRes.activities.length, items: activityRes.activities, reason: "" };
    } catch {
      activitySection = { available: false, count: 0, items: [], reason: "Recent activity query failed" };
    }

    // 8. Actual Source Update Time and Freshness
    let sourceUpdatedAt: string | null = null;
    try {
      const latestPaymentRow = db.prepare(`SELECT MAX(confirmed_at) as latest FROM payments WHERE verified = 1`).get() as any;
      sourceUpdatedAt = latestPaymentRow?.latest || null;
    } catch {}
    if (!sourceUpdatedAt) {
      sourceUpdatedAt = at;
    }

    return NextResponse.json({
      updatedAt: at,
      sourceUpdatedAt,
      available: true,
      isLivePaymentMode: live,
      reason: live ? null : "RankBid is in test payment mode. Test payments are excluded from live figures.",
      metrics: {
        members: membersSection.count,
        onlineMembers: onlineSection.count,
        connectedWebsites: websitesSection.count,
        verifiedSpendCents: spendSection.cents,
      },
      topTen: rankingsSection.items,
      companies: companyDirectorySection.items,
      sections: {
        members: membersSection,
        onlineStatus: onlineSection,
        connectedWebsites: websitesSection,
        verifiedSpend: spendSection,
        rankings: rankingsSection,
        companyDirectory: companyDirectorySection,
        recentActivity: activitySection,
      },
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      updatedAt: at,
      sourceUpdatedAt: null,
      available: false,
      isLivePaymentMode: false,
      reason: "Live RankBid data could not be loaded right now: " + (err?.message || "Internal database error"),
      metrics: {
        members: null,
        onlineMembers: null,
        connectedWebsites: null,
        verifiedSpendCents: null,
      },
      topTen: [],
      companies: [],
      sections: {
        members: { available: false, count: null, reason: "Outage" },
        onlineStatus: { available: false, count: null, reason: "Outage" },
        connectedWebsites: { available: false, count: null, reason: "Outage" },
        verifiedSpend: { available: false, cents: null, reason: "Outage" },
        rankings: { available: false, count: 0, items: [], reason: "Outage" },
        companyDirectory: { available: false, count: 0, items: [], reason: "Outage" },
        recentActivity: { available: false, count: 0, items: [], reason: "Outage" },
      },
    }, {
      status: 200,
      headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
    });
  }
}
