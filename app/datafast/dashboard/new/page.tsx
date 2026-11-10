import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, getSessionFromToken } from "@/lib/auth";
import AnalyticsSiteSetup from "@/components/AnalyticsSiteSetup";
export const dynamic="force-dynamic";
export const metadata={title:"Add a website"};
export default async function NewAnalyticsWebsite(){
  const user=getSessionFromToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if(!user)redirect("/login?next=/datafast/dashboard/new");
  let appOrigin="http://localhost:3000";
  try { appOrigin=new URL(process.env.NEXT_PUBLIC_APP_URL||appOrigin).origin; } catch {}
  return <AnalyticsSiteSetup appOrigin={appOrigin}/>;
}
