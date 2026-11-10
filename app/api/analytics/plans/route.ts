import { NextResponse } from "next/server";
import { listAnalyticsPlans } from "@/lib/analytics-plan";
import { getUser } from "@/lib/auth";
import { NextRequest } from "next/server";
export const dynamic="force-dynamic";
export function GET(req:NextRequest){const isAdmin=getUser(req)?.role==="admin";return NextResponse.json({plans:isAdmin?[]:listAnalyticsPlans(),isAdmin},{headers:{"Cache-Control":"no-store"}});}
