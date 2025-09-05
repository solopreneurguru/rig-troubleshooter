import { NextResponse } from 'next/server';
import Airtable from "airtable";

const apiKey = process.env.AIRTABLE_API_KEY?.trim();
const baseId = process.env.AIRTABLE_BASE_ID;
const TB_SESSIONS = process.env.TB_SESSIONS!;

const base = apiKey && baseId ? new Airtable({ apiKey }).base(baseId) : null;
const table = (id?: string) => {
  if (!base) throw new Error("Airtable base not configured");
  if (!id) throw new Error("Airtable table ID not provided");
  return base(id);
};

export async function POST() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'Disabled in production' }, { status: 403 });
  }
  if (!TB_SESSIONS) {
    return NextResponse.json({ ok: false, error: 'TB_SESSIONS env missing' }, { status: 500 });
  }

  try {
    // Delete sessions created recently that look like demo runs
    // Adjust filterByFormula to your base schema field names if needed
    const since = new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(); // last 6h
    const filter = `AND(
      {CreatedAt} >= '${since}',
      FIND('demo.', {RulePackKey}) > 0
    )`;

    const sessTable = table(TB_SESSIONS);
    const toDelete: string[] = [];
    await sessTable.select({ filterByFormula: filter }).eachPage((records, next) => {
      for (const r of records) toDelete.push(r.id);
      next();
    });

    const chunks: string[][] = [];
    for (let i = 0; i < toDelete.length; i += 10) chunks.push(toDelete.slice(i, i + 10));
    for (const c of chunks) {
      await sessTable.destroy(c);
    }

    return NextResponse.json({ ok: true, deleted: toDelete.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
