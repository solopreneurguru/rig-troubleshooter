/**
 * Lightweight SDK diag (no secrets in response). Helps confirm connectivity
 * without DevTools. Returns true/false flags and small counts.
 */
import { NextResponse } from 'next/server';
import { rigsFirstPage } from '@/lib/airtableSdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'iad1';

export async function GET() {
  try {
    const env = {
      AIRTABLE_API_KEY: !!process.env.AIRTABLE_API_KEY,
      AIRTABLE_BASE_ID: !!process.env.AIRTABLE_BASE_ID,
      TB_RIGS: !!process.env.TB_RIGS,
      TB_SESSIONS: !!process.env.TB_SESSIONS,
      TB_EQUIPMENT_TYPES: !!process.env.TB_EQUIPMENT_TYPES,
      TB_EQUIPMENT_INSTANCES: !!process.env.TB_EQUIPMENT_INSTANCES,
    };
    const rigs = await rigsFirstPage().catch(() => []);
    return NextResponse.json({ ok:true, env, rigCount: rigs.length });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: e?.message || 'timeout' }, { status: 503 });
  }
}
