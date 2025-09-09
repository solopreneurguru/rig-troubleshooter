import { NextResponse } from 'next/server';
import { rigsFirstPage } from '@/lib/airtableSdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'iad1';

export async function GET() {
  const t0 = Date.now();
  console.log("[api] ▶ rigs/list");
  try {
    const rigs = await rigsFirstPage();
    console.log("[api] ◀ rigs/list", { ms: Date.now()-t0, count: rigs.length });
    return NextResponse.json({ ok: true, rigs });
  } catch (e: any) {
    console.log("[api] ◀ rigs/list fail", { ms: Date.now()-t0, msg: e?.message || String(e) });
    console.error('[api] rigs/list', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'timeout' }, { status: 503 });
  }
}