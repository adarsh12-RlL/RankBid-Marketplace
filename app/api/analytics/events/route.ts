import crypto from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import getDb from '@/lib/db';
import {sameOrigin,limited} from '@/lib/auth';
import {agentInfo,ensureAnalyticsSchema} from '@/lib/analytics';
import {countryFromTrustedProxy} from '@/lib/analytics-geo';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 if(limited(req,'analytics',180))return NextResponse.json({error:'Rate limited'},{status:429});
 try{
  const requestUrl=new URL(req.url),configuredOrigin=process.env.NEXT_PUBLIC_APP_URL?new URL(process.env.NEXT_PUBLIC_APP_URL).origin:requestUrl.origin;
  if(!['http:','https:'].includes(requestUrl.protocol)||requestUrl.origin!==configuredOrigin||!requestUrl.hostname||requestUrl.hostname.length>253)return NextResponse.json({error:'Invalid analytics hostname'},{status:403});
  const hostname=requestUrl.hostname.toLowerCase();
  if(Number(req.headers.get('content-length')||0)>4096)return NextResponse.json({error:'Payload too large'},{status:413});
  const b=await req.json(),session=String(b.session||'');if(!/^[a-f0-9]{32}$/.test(session)||![undefined,'pageview','heartbeat','exit'].includes(b.type))throw Error();
  const existing=req.cookies.get('rankbid_visitor')?.value,visitor=existing&&/^[a-f0-9]{32}$/.test(existing)?existing:crypto.randomBytes(16).toString('hex');
  const db=getDb(),now=new Date().toISOString();ensureAnalyticsSchema(db);let eventId=Number(b.eventId);
  if(b.type==='heartbeat'){const duration=Math.max(0,Math.min(3600000,Math.floor(Number(b.duration)||0)));db.prepare("UPDATE analytics_events SET duration_ms=MAX(duration_ms,?),last_seen_at=? WHERE id=? AND session_id=? AND visitor_id=? AND event_type='pageview'").run(duration,now,eventId,session,visitor);}
  else{
   const path=String(b.path||'').slice(0,256);if(!/^\/(?!\/)[^?\x00-\x20]*$/.test(path)||/^\/(api|admin|stats|datafast)(\/|$)/.test(path))throw Error();
   let exitUrl='';
   if(b.type==='exit'){
    if(typeof b.url!=='string'||!b.url||b.url.length>8192)throw Error();const destination=new URL(b.url);
    if(!['http:','https:'].includes(destination.protocol)||destination.origin===configuredOrigin)throw Error();
    // Origin only: never persist userinfo, destination paths, query or hash.
    // Checkout session IDs and authentication tokens cannot enter the report.
    exitUrl=destination.origin;
   }
   let referrer='';try{const ref=new URL(String(b.referrer||''));if(ref.origin!==requestUrl.origin)referrer=ref.hostname.slice(0,100);}catch{}
   const a=agentInfo(req.headers.get('user-agent')||'');
   const country=countryFromTrustedProxy(req.headers);
   const recent=b.type==='exit'?undefined:db.prepare("SELECT id FROM analytics_events WHERE session_id=? AND visitor_id=? AND path=? AND hostname=? AND event_type='pageview' AND created_at>?").get(session,visitor,path,hostname,new Date(Date.now()-3000).toISOString()) as {id:number}|undefined;
   eventId=recent?.id||Number(db.prepare('INSERT INTO analytics_events(visitor_id,session_id,path,hostname,referrer,campaign,browser,os,device,country,region,city,geo_provider,created_at,last_seen_at,event_type,exit_url) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(visitor,session,path,hostname,referrer,String(b.campaign||'').slice(0,100),a.browser,a.os,a.device,country,'Unknown','Unknown','',now,now,b.type==='exit'?'exit':'pageview',exitUrl).lastInsertRowid);
  }
  const response=NextResponse.json({ok:true,eventId},{headers:{'Cache-Control':'no-store'}});response.cookies.set('rankbid_visitor',visitor,{httpOnly:true,sameSite:'lax',secure:requestUrl.protocol==='https:',maxAge:31536000,path:'/'});return response;
 }catch{return NextResponse.json({error:'Invalid analytics event'},{status:400});}
}
