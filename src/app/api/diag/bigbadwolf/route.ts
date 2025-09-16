import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getAirtableBase, tables } from '@/lib/airtable';

async function count(base: any, table: string) {
  try {
    const page = await base(table).select({ pageSize: 1 }).firstPage();
    const ok = Array.isArray(page);
    return { ok, sampleCount: ok ? page.length : 0, error: null };
  } catch (e: any) {
    return { ok: false, sampleCount: 0, error: String(e?.message ?? e) };
  }
}

export async function GET() {
  const envKeys = [
    'AIRTABLE_API_KEY','AIRTABLE_BASE_ID',
    'TB_SESSIONS','TB_CHATS','TB_RIGS','TB_DOCS','TB_EQUIPMENT_INSTANCES',
    'BLOB_READ_WRITE_TOKEN','OPENAI_API_KEY','ADMIN_DEV_TOKEN','TB_RULEPACKS'
  ];
  const envs = Object.fromEntries(envKeys.map(k => [k, !!process.env[k]]));

  let tablesStatus: any = {};
  let v2Packs = { activeV2Count: 0, error: null as null | string };

  try {
    const base = getAirtableBase();
    const checks = {
      sessions: await count(base, tables.sessions),
      chats:    await count(base, tables.chats),
      rigs:     await count(base, tables.rigs),
      docs:     await count(base, tables.docs),
      equipmentInstances: await count(base, tables.equipmentInstances),
    };
    tablesStatus = checks;

    // Optional RulePacks check if env present
    if (process.env.TB_RULEPACKS) {
      try {
        const rows = await base(String(process.env.TB_RULEPACKS)).select({ pageSize: 50, filterByFormula: "AND({Active}=1)" }).all();
        // Count rows that look like v2: Version==2 OR Key contains '_v2' OR .v2 suffix
        const isV2 = (r: any) => {
          const key = String(r.get('Key') ?? '');
          const ver = Number(r.get('Version') ?? 0);
          return ver === 2 || key.endsWith('_v2') || key.endsWith('.v2');
        };
        v2Packs.activeV2Count = rows.filter(isV2).length;
      } catch (e: any) {
        v2Packs.error = String(e?.message ?? e);
      }
    }
  } catch (e: any) {
    tablesStatus = { fatal: String(e?.message ?? e) };
  }

  return NextResponse.json({
    ok: true,
    envs,
    tables: tablesStatus,
    v2Packs,
    ts: new Date().toISOString()
  });
}
