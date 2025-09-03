import { NextRequest } from 'next/server';
import { parseRulePackV2, validateRulePackGraph } from '@/lib/rulepacks';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = typeof body?.json === 'string' ? JSON.parse(body.json) : body?.json;

    // Use the existing Zod schema/helpers you added in rulepacks.ts
    const parsed = parseRulePackV2(raw); // should return { ok:boolean, data?, error? } or safeParse(). Either is fine; adjust to current API.
    if (!parsed.ok) return Response.json({ ok: false, error: parsed.error }, { status: 400 });

    const result = await validateRulePackGraph(parsed.data!); // should return { warnings: [] } — adjust to real function name
    return Response.json({ ok: true, warnings: result.warnings ?? [] });
  } catch (e:any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ ok: true, hint: 'POST { json: RulePackV2 }' });
}
