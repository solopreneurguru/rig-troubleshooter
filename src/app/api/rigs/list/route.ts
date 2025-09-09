import { NextResponse } from 'next/server';
import { table } from "@/lib/airtable";
import { withDeadline } from "@/lib/deadline";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      return NextResponse.json({ ok: false, error: "Airtable env missing" }, { status: 500 });
    }

    const tb = table(process.env.TB_RIGS || "Rigs");
    const work = (async () => {
      const records = await tb.select({
        pageSize: 50,
        fields: ['Name'], // keep minimal
        sort: [{field:'Name', direction:'asc'}],
        view: undefined
      }).all();
      const rigs = records.map(r => ({ id: r.id, name: r.get('Name') || '' }));
      return NextResponse.json({ ok: true, rigs });
    })();
    return await withDeadline(work, 8000, 'rigs/list');
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'failed' }, { status: 503 });
  }
}
