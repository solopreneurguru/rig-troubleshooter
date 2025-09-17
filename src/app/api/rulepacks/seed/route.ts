import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic'; export const revalidate = 0;
import { getAirtableBase } from '@/lib/airtable';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get('confirm') !== '1') {
    return NextResponse.json({ ok:false, need:`GET ?confirm=1` });
  }
  return POST(req);
}

export async function POST(_req: NextRequest) {
  try {
    const RP = process.env.TB_RULEPACKS;
    if (!RP) return NextResponse.json({ ok:false, error:'NO_TB_RULEPACKS' }, { status: 400 });
    const base = getAirtableBase();

    const key = 'topdrive_basic_power_v2';
    const rows = await base(String(RP)).select({ filterByFormula: `{Key}='${key}'`, pageSize: 1 }).firstPage();
    const json = {
      version: 2,
      nodes: [{
        id: "check_main_contactor",
        type: "measure",
        unit: "VDC",
        points: "A16-B12",
        expect: "24±2",
        passNext: "check_enable_chain",
        failNext: "check_F3_fuse",
        why: "Control supply must be present at A16-B12 before logic.",
        cite: [{ doc:"Electrical", page:12, tag:"TB1:A16/B12" }]
      }]
    };

    if (rows.length) {
      await base(String(RP)).update([{ id: rows[0].id, fields: { Active: true, Version: 2 } }]);
      return NextResponse.json({ ok:true, updated:true, id: rows[0].id });
    }

    const created = await base(String(RP)).create([{
      fields: { Name: 'TopDrive — Basic Power (v2)', Key: key, Version: 2, Active: true, Json: JSON.stringify(json) }
    }]);
    return NextResponse.json({ ok:true, created:true, id: created[0].id });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message ?? e) }, { status: 500 });
  }
}
