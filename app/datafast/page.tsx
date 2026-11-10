import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";
import { listAnalyticsPlans } from "@/lib/analytics-plan";
import RankLensMarketing from "@/components/RankLensMarketing";

export const dynamic = "force-dynamic";
export const metadata = { title: "RankLens | Website analytics" };

export default async function Page() {
  const user = getSessionFromToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  const isAdmin = user?.role === "admin";

  // Customer plan details are deliberately never sent to the admin page.
  const plans = isAdmin ? [] : listAnalyticsPlans();
  return <RankLensMarketing initialIsAdmin={isAdmin} initialPlans={plans} />;
}
