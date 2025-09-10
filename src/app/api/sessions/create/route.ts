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
    const { problem, equipmentId, rigId } = body || {};

    if (!problem || typeof problem !== 'string' || problem.trim().length < 3) {
      return NextResponse.json({ ok: false, error: 'Problem must be 3+ chars' }, { status: 422 });
    }

    // Determine the Sessions→Equipment link field from env, fallback to 'EquipmentInstance'
    const EQUIP_FIELD = process.env.SESSIONS_EQUIPMENT_FIELD?.trim() || 'EquipmentInstance';
    if (!/^[A-Za-z0-9 _-]{1,64}$/.test(EQUIP_FIELD)) {
      return NextResponse.json({ ok: false, error: `Invalid SESSIONS_EQUIPMENT_FIELD value` }, { status: 500 });
    }

    // Build Airtable fields (align with base schema)
    const fields: Record<string, any> = {
      Problem: problem.trim(),
      // Status: 'Open', // uncomment if 'Open' is a valid SS option in your base
    };
    if (equipmentId) (fields as any)[EQUIP_FIELD] = [equipmentId];
    if (rigId) (fields as any).Rig = [rigId];

    const { id } = await createSessionViaSdk(fields);
    const ms = Date.now() - t0;
    return NextResponse.json({ ok: true, id, redirect: `/sessions/${id}`, ms });
  } catch (err: any) {
    const ms = Date.now() - t0;
    return NextResponse.json({ ok: false, error: err?.message || 'error', ms }, { status: 500 });
  }
}