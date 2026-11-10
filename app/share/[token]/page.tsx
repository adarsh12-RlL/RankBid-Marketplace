import { notFound } from "next/navigation";
import { getSharedAnalyticsSite } from "@/lib/analytics-sites";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{token:string}>}){const {token}=await params,site=getSharedAnalyticsSite(token);return {title:site?`${site.domain} analytics | RankLens`:"Shared analytics | RankLens"};}
export default async function SharedAnalytics({params}:{params:Promise<{token:string}>}){
  const {token}=await params,site=getSharedAnalyticsSite(token);if(!site)notFound();
  return <AnalyticsDashboard reportUrl={`/api/analytics/site-shares/${encodeURIComponent(token)}/report`} timezone={site.timezone}/>;
}
