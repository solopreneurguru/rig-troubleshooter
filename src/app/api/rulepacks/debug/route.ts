import { NextResponse } from 'next/server';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic'; export const revalidate = 0;
import { getAirtableBase, tables } from '@/lib/airtable';

export async function GET() {
  try {
    const base = getAirtableBase();
    const t = tables.rulepacks || process.env.TB_RULEPACKS || 'RulePacks';
    const rows = await base(String(t)).select({ pageSize: 5 }).firstPage();
    const samples = rows.map(r => ({ id: r.id, fields: Object.keys((r as any).fields || {}) }));
    const keys = Array.from(new Set(samples.flatMap(s => s.fields))).sort();
    return NextResponse.json({ ok:true, table:t, keys, samplesCount: samples.length, samples });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message ?? e) }, { status: 500 });
  }
}
