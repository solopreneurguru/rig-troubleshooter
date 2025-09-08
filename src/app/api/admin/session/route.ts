import { NextResponse } from "next/server";
import { table } from "@/lib/rulepacks";

const TB_SESSIONS = process.env.TB_SESSIONS!;
const RP_FIELD = process.env.SESSIONS_RULEPACK_FIELD || 'RulePackKey';

function hasAdmin(req: Request) {
  const token = req.headers.get('x-admin-token');
  const need = process.env.ADMIN_DEV_TOKEN;
  return !!need && !!token && token === need;
}

export async function POST(req: Request) {
  if (process.env.VERCEL_ENV === 'production' && !hasAdmin(req)) {
    return NextResponse.json({ ok: false, error: 'Disabled in production' }, { status: 403 });
  }
  if (!TB_SESSIONS) return NextResponse.json({ ok: false, error: 'TB_SESSIONS missing' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const problem = (body?.problem as string) || 'TopDrive won\'t start';
  const rulePackKey = (body?.rulePackKey as string) || 'demo.topdrive.block15.v2';

  const created = await table(TB_SESSIONS).create([{
    fields: { Problem: problem, [RP_FIELD]: rulePackKey, Status: 'Open' }
  }]);

  const rec = Array.isArray(created) ? created[0] : created;
  return NextResponse.json({ ok: true, sessionId: rec.id });
}
