import {NextRequest,NextResponse} from 'next/server';
import {analyticsReport,ANALYTICS_PERIODS,DIMENSIONS,type AnalyticsFilter} from '@/lib/analytics';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const query=new URL(req.url).searchParams,period=query.get('period')||'last24h';
 if(!(ANALYTICS_PERIODS as readonly string[]).includes(period))return NextResponse.json({error:'Invalid period'},{status:400});
 const rawOffset=query.get('offset')??'0';if(!/^\d{1,2}$/.test(rawOffset)||Number(rawOffset)>60)return NextResponse.json({error:'Invalid offset'},{status:400});
 let filters:AnalyticsFilter[];
 try{filters=JSON.parse(query.get('filters')||'[]');if(!Array.isArray(filters)||filters.length>5||filters.some(filter=>!filter||typeof filter!=='object'||!DIMENSIONS.includes(filter.dimension)||typeof filter.value!=='string'||filter.value.length>256||!['is','is_not','contains','not_contains'].includes(filter.operator||'is')))throw Error();}
 catch{return NextResponse.json({error:'Invalid filters'},{status:400});}
 try{const range=period==='custom'?{from:query.get('from')||'',to:query.get('to')||''}:undefined;return NextResponse.json(analyticsReport(period,query.get('granularity')==='daily'?'daily':'hourly',filters,Number(rawOffset),new Date(),range,query.get('realtime')==='1'),{headers:{'Cache-Control':'no-store'}});}
 catch(error){if(error instanceof RangeError)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({error:'Analytics are temporarily unavailable'},{status:503});}
}
