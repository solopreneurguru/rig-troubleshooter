import { NextResponse } from 'next/server';
import { createSessionViaSdk } from '@/lib/airtableSdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'iad1';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const problem = String(body?.problem ?? '').trim();
    const equipmentId = body?.equipmentId ? String(body.equipmentId) : undefined;
    const rigId = body?.rigId ? String(body.rigId) : undefined;

    if (problem.length < 3) {
      return NextResponse.json({ ok:false, error:'problem (min 3 chars) required' }, { status: 422 });
    }

    const fields: Record<string, any> = {
      Problem: problem,
      Status: 'Open',
    };
    if (equipmentId) fields.EquipmentInstance = [equipmentId];
    if (rigId) fields.Rig = [rigId];

    const id = await createSessionViaSdk(fields);
    return NextResponse.json({ ok:true, id, redirect:`/sessions/${id}` }, { status: 201 });
  } catch (e: any) {
    console.error('[api] sessions/create', e?.message || e);
    return NextResponse.json({ ok:false, error: e?.message || 'timeout' }, { status: 503 });
  }
}