import {cookies} from "next/headers";
import {NextRequest,NextResponse} from "next/server";
import {getSessionFromCookieHeader} from "@/lib/auth";
import {getOwnedAnalyticsSite,ensureAnalyticsSitesSchema} from "@/lib/analytics-sites";
import {hasAnalyticsBotAccess} from "@/lib/analytics-plan";
import getDb from "@/lib/db";
export const dynamic="force-dynamic";
const cell=(value:unknown)=>'"'+String(value??"").replaceAll('"','""')+'"';
export async function GET(req:NextRequest,{params}:{params:Promise<{siteId:string}>}){
 const user=getSessionFromCookieHeader((await cookies()).toString());if(!user)return NextResponse.json({error:"Sign in to export analytics."},{status:401});
 if(!hasAnalyticsBotAccess(user.id))return NextResponse.json({error:"CSV export is available with RankLens Pro."},{status:403});
 const {siteId}=await params,db=getDb();ensureAnalyticsSitesSchema(db);
 const site=getOwnedAnalyticsSite(user.id,siteId,db);if(!site)return NextResponse.json({error:"Website not found."},{status:404});
 const raw=new URL(req.url).searchParams.get("days")||"30";if(!/^\d{1,3}$/.test(raw)||Number(raw)<1||Number(raw)>365)return NextResponse.json({error:"Choose a range from 1 to 365 days."},{status:400});
 const from=new Date(Date.now()-Number(raw)*86400000).toISOString();
 const rows=db.prepare(`SELECT path,referrer,campaign,browser,os,device,country,duration_ms,created_at FROM analytics_site_events WHERE site_id=? AND event_type='pageview' AND created_at>=? ORDER BY created_at DESC LIMIT 50000`).all(site.id,from) as Record<string,unknown>[];
 const headers=["visited_at_utc","page","referrer_domain","campaign","browser","operating_system","device","country","duration_ms"];
 const csv=[headers.map(cell).join(","),...rows.map(row=>[row.created_at,row.path,row.referrer,row.campaign,row.browser,row.os,row.device,row.country,row.duration_ms].map(cell).join(","))].join("\r\n");
 return new NextResponse("\uFEFF"+csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="ranklens-${site.domain}-${raw}d.csv"`,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
