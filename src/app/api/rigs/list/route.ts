import { NextResponse } from 'next/server';
import { withDeadline, logStart } from '@/lib/deadline';
import { table } from '@/lib/airtable'; // use existing helper that returns an Airtable table

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const end = logStart('rigs/list');
  try {
    // minimal fields + small page for snappy response
    const tb = table(process.env.TB_RIGS!);
    const page = await withDeadline(
      tb.select({ fields: ['Name'], pageSize: 50 }).firstPage(),
      8000,
      'rigs/list'
    );
    const rigs = page
      .filter(r => !!r.fields?.Name)
      .map(r => ({ id: r.id, name: String(r.fields.Name) }));
    end();
    return NextResponse.json({ ok: true, rigs });
  } catch (e: any) {
    end();
    console.error('[api] rigs/list error', { error: e?.message || String(e) });
    return NextResponse.json({ ok: false, error: e?.message || 'timeout' }, { status: 503 });
  }
}
