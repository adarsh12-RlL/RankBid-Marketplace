import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getPaymentMode, isTestMode } from '@/lib/ranking';
import { categoryToSlug } from '@/lib/utils';
import { getPublicActivity } from '@/lib/public-activity';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const rawLimit = new URL(req.url).searchParams.get('limit');
  const limit = rawLimit === null ? 8 : /^\d+$/.test(rawLimit) ? Number(rawLimit) : NaN;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
    return NextResponse.json({ error: 'Activity limit must be an integer from 1 to 50.' }, { status: 400 });
  try {
    return NextResponse.json(getPublicActivity({ limit }, {
      db: getDb(), mode: getPaymentMode(), isTest: isTestMode(), categoryKey: categoryToSlug,
    }), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Latest activity is temporarily unavailable.' }, { status: 503 });
  }
}
