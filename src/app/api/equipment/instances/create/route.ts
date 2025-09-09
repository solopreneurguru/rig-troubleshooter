import { NextResponse } from 'next/server';
import { withDeadline, logStart } from '@/lib/deadline';
import { table } from '@/lib/airtable';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const end = logStart('equip/create');
  try {
    const { name, rigName, typeName, serial, plcDocUrl } = await req.json().catch(() => ({}));
    if (!name) return NextResponse.json({ ok:false, error:'name required' }, { status: 422 });

    const rigsTb = table(process.env.TB_RIGS!);
    const typesTb = table(process.env.TB_EQUIPMENT_TYPES!);
    const instTb = table(process.env.TB_EQUIPMENT_INSTANCES!);

    // look up rig by name (case-insensitive contains). Keep it cheap.
    const rigPage = await withDeadline(
      rigsTb.select({ fields:['Name'], filterByFormula: `FIND(LOWER("${(rigName||'').trim()}"), LOWER({Name}))` , pageSize: 5 }).firstPage(),
      8000,
      'equip/rigLookup'
    );
    const rig = rigPage?.[0];
    if (!rig) return NextResponse.json({ ok:false, error:'rig not found' }, { status: 404 });

    // type is optional; if provided, try to link by name
    let typeId: string | undefined;
    if (typeName) {
      const typePage = await withDeadline(
        typesTb.select({ fields:['Name'], filterByFormula: `FIND(LOWER("${typeName.trim()}"), LOWER({Name}))`, pageSize:5 }).firstPage(),
        8000,
        'equip/typeLookup'
      );
      typeId = typePage?.[0]?.id;
    }

    const created = await withDeadline(
      instTb.create([{
        fields: {
          Name: name,
          Rig: [rig.id],
          ...(typeId ? { Type: [typeId] } : {}),
          ...(serial ? { Serial: serial } : {}),
          ...(plcDocUrl ? { PLCProjectDoc: plcDocUrl } : {})
        }
      }]),
      8000,
      'equip/create'
    );

    end();
    return NextResponse.json({ ok: true, id: created[0].id });
  } catch (e: any) {
    end();
    console.error('[api] equip/create error', { error: e?.message || String(e) });
    return NextResponse.json({ ok:false, error: e?.message || 'timeout' }, { status: 503 });
  }
}