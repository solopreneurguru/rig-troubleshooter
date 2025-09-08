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

  const since = new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(); // last 6h
  const filter = `AND({CreatedAt} >= '${since}', FIND('demo.', {${RP_FIELD}}) > 0)`;

  const sessTable = table(TB_SESSIONS);
  const ids: string[] = [];
  await sessTable.select({ filterByFormula: filter }).eachPage((recs, next) => {
    for (const r of recs) ids.push(r.id);
    next();
  });

  for (let i = 0; i < ids.length; i += 10) {
    await sessTable.destroy(ids.slice(i, i + 10));
  }
  return NextResponse.json({ ok: true, deleted: ids.length });
}
