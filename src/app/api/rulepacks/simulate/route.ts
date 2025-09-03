import { NextRequest } from 'next/server';
import { parseRulePackV2, simulateRulePack } from '@/lib/rulepacks';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = typeof body?.json === 'string' ? JSON.parse(body.json) : body?.json;
    const path = body?.path ?? [];

    const parsed = parseRulePackV2(raw);
    if (!parsed.ok) return Response.json({ ok: false, error: parsed.error }, { status: 400 });

    const sim = await simulateRulePack(parsed.data!, path);
    return Response.json({ ok: true, ...sim });
  } catch (e:any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ ok: true, hint: 'POST { json: RulePackV2, path: [{value: number, pass: boolean}] }' });
}
