export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getAirtableBase, tables } from '@/lib/airtable';

export async function GET() {
  try {
    const base = getAirtableBase();
    const rows = await base(tables.equipmentInstances).select({ pageSize: 5 }).all();

    const sample = rows.slice(0, 5).map(r => ({
      id: r.id,
      name: String(r.get('Name') ?? r.get('Title') ?? ''),
      rig: r.get('Rig') ?? r.get('RigId') ?? null,
      type: r.get('Type') ?? r.get('EquipmentType') ?? null,
      fields: Object.keys((r as any)?._rawJson?.fields ?? {}),
    }));

    return NextResponse.json({
      ok: true,
      table: tables.equipmentInstances,
      countReturned: rows.length,
      sample,
      hint: "If your main endpoint is empty, check its filters or field names. Use 'Name' or 'Title'; link fields may be arrays."
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
