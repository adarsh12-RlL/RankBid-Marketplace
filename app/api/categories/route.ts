import { NextResponse } from 'next/server';
import { CATEGORIES } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ categories: CATEGORIES });
}
