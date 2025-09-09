import { NextResponse } from 'next/server';
import { rigsFirstPage } from '@/lib/airtableSdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'iad1';

export async function GET() {
  try {
    const rigs = await rigsFirstPage();
    return NextResponse.json({ ok: true, rigs });
  } catch (e: any) {
    console.error('[api] rigs/list', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'timeout' }, { status: 503 });
  }
}