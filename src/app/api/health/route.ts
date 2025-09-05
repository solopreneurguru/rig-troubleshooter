import { NextResponse } from "next/server";
import { listRulePacks } from "@/lib/airtable";

const ENV_KEYS = [
  "AIRTABLE_API_KEY",
  "AIRTABLE_BASE_ID",
  "TB_RIGS",
  "TB_DOCS",
  "TB_SESSIONS",
  "TB_ACTIONS",
  "TB_READINGS",
  "TB_FINDINGS",
  "TB_RULEPACKS",
  "TB_TECHS",
  "SESSIONS_RULEPACK_FIELD",
  "SESSIONS_EQUIPMENT_FIELD",
  "EQUIPINSTANCES_TYPE_FIELD",
];

export async function GET() {
  const env = Object.fromEntries(ENV_KEYS.map(k => [k, !!process.env[k]]));
  let airtableOk = true;
  let packs: Array<{ key: string; isV2?: boolean }> = [];
  try {
    // listRulePacks was added earlier (Block 12/13). If its shape differs, adapt here.
    // It should return an array of { key, isV2, equipmentTypeName?, json? } for Active packs.
    // If not present, query Airtable directly using your "table" helper (but prefer listRulePacks).
    // @ts-ignore
    packs = await listRulePacks();
  } catch {
    airtableOk = false;
  }

  const v2Count = (packs || []).filter(p => p && (p as any).isV2).length;
  const ok = env["AIRTABLE_API_KEY"] && airtableOk;

  return NextResponse.json({
    ok: !!ok,
    env,
    airtableOk,
    rulepacks: { total: packs.length, v2: v2Count },
    notes: "ok=true means env + Airtable reachable. rulepacks counts only consider Active packs.",
  });
}
