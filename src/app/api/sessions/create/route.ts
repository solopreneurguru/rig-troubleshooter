import { NextResponse } from 'next/server';
import { createSessionViaSdk } from '@/lib/airtableSdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'iad1';

export async function POST(req: Request) {
  const t0 = Date.now();
  console.log("[api] ▶ sessions/create");
  try {
    const body = await req.json().catch(() => ({}));
    const problem = String(body?.problem ?? '').trim();
    const equipmentId = body?.equipmentId ? String(body.equipmentId) : undefined;
    const rigId = body?.rigId ? String(body.rigId) : undefined;

    if (problem.length < 3) {
      console.log("[api] ◀ sessions/create validation-fail", { ms: Date.now()-t0 });
      return NextResponse.json({ ok:false, error:'problem (min 3 chars) required' }, { status: 422 });
    }

    // Minimal, schema-aligned fields (no Title write: Title is a Formula)
    const fields: Record<string, any> = {
      Problem: problem,
      // If 'Open' is a valid Status option in Airtable, uncomment next line:
      // Status: 'Open',
    };
    if (rigId) fields.Rig = [rigId];
    if (equipmentId) fields.EquipmentInstance = [equipmentId];

    const id = await createSessionViaSdk(fields);
    console.log("[api] ◀ sessions/create ok", { ms: Date.now()-t0, id });
    return NextResponse.json({ ok:true, id, redirect:`/sessions/${id}` }, { status: 201 });
  } catch (e: any) {
    console.log("[api] ◀ sessions/create fail", { ms: Date.now()-t0, msg: e?.message || String(e) });
    console.error('[api] sessions/create', e?.message || e);
    return NextResponse.json({ ok:false, error: e?.message || 'timeout' }, { status: 503 });
  }
}