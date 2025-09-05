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

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'Disabled in production' }, { status: 403 });
  }
  if (!TB_SESSIONS) {
    return NextResponse.json({ ok: false, error: 'TB_SESSIONS env missing' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { rulePackKey, problem } = body;

    if (!rulePackKey) {
      return NextResponse.json({ ok: false, error: 'rulePackKey required' }, { status: 400 });
    }

    const sessTable = table(TB_SESSIONS);
    const fields: any = {
      RulePackKey: rulePackKey,
      Problem: problem || 'Demo session for testing',
      Status: 'Active',
      CreatedAt: new Date().toISOString()
    };

    const created = await sessTable.create([{ fields }]);
    const rec = created && created[0] ? { id: created[0].id, ...(created[0].fields as any) } : null;

    return NextResponse.json({ 
      ok: true, 
      sessionId: rec?.id,
      session: rec 
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
