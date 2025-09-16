import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getAirtableBase, tables } from '@/lib/airtable';

type Equip = {
  id: string;
  name: string;
  rig?: string | string[] | null;
  type?: string | null;
  serial?: string | null;
};

function readString(x: any): string {
  if (x == null) return '';
  if (Array.isArray(x)) return x.join(', ');
  return String(x);
}

export async function GET(req: NextRequest) {
  try {
    const base = getAirtableBase();

    // Optional query params: ?q=TopDrive&limit=50
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const limit = Math.min(Number(searchParams.get('limit') || 100), 200);

    const select: any = { pageSize: limit, ...(q ? { filterByFormula: `FIND(LOWER("${q}"), LOWER({Name}&{Title}&{Type}))` } : {}) };

    const rows = await base(tables.equipmentInstances).select(select).all();

    const items: Equip[] = rows.map((r: any) => {
      const f = (r._rawJson?.fields ?? {}) as Record<string, any>;
      const name = readString(f['Name'] ?? f['Title'] ?? f['Equipment'] ?? '');
      return {
        id: r.id,
        name,
        rig: f['Rig'] ?? f['RigId'] ?? f['Rig Name'] ?? null,            // may be an array (linked records)
        type: readString(f['Type'] ?? f['EquipmentType'] ?? null),
        serial: readString(f['Serial'] ?? f['SN'] ?? null),
      };
    });

    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: 'EQUIP_LIST_FAILED', detail: String(err?.message ?? err) }, { status: 500 });
  }
}
