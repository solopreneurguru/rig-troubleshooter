import { NextResponse } from 'next/server';
import { createEquipmentViaSdk } from '@/lib/airtableSdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'iad1';

export async function POST(req: Request) {
  try {
    const { name, rigName, typeName, serial, plcDocUrl } = await req.json().catch(() => ({}));
    if (!name) return NextResponse.json({ ok:false, error:'name required' }, { status: 422 });

    const id = await createEquipmentViaSdk({ name, rigName, typeName, serial, plcDocUrl });
    if (!id) return NextResponse.json({ ok:false, error:'create failed' }, { status: 502 });

    return NextResponse.json({ ok:true, id });
  } catch (e: any) {
    console.error('[api] equipment/create', e?.message || e);
    return NextResponse.json({ ok:false, error: e?.message || 'timeout' }, { status: 503 });
  }
}