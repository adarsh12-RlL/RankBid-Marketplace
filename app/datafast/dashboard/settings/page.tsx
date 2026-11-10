import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import getDb from "@/lib/db";
import { AUTH_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";
import { ensureAnalyticsSitesSchema } from "@/lib/analytics-sites";
import RankLensSettings from "@/components/RankLensSettings";
export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = getSessionFromToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!user) redirect("/login?next=/datafast/dashboard/settings");
  ensureAnalyticsSitesSchema();
  const sites = getDb().prepare(`SELECT id,domain,timezone,
    CASE WHEN revenue_key_hash<>'' THEN 1 ELSE 0 END AS key_configured
    FROM analytics_sites WHERE owner_id=? ORDER BY created_at DESC`).all(user.id) as { id: string; domain: string; timezone: string; key_configured: number }[];
  const requested = (await searchParams).tab;
  const tab = requested === "api" || requested === "more" ? requested : "general";
  return <RankLensSettings email={user.email} sites={sites} initialTab={tab}/>;
}
