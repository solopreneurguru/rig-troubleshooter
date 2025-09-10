import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";
export async function GET() {
  const b = (k:string) => Boolean(process.env[k] && String(process.env[k]).length);
  const keys = [
    "AIRTABLE_API_KEY","AIRTABLE_BASE_ID",
    "TB_RIGS","TB_SESSIONS","TB_EQUIPMENT_TYPES","TB_EQUIPMENT_INSTANCES",
    "TB_RULEPACKS","TB_DOCS","TB_ACTIONS","TB_READINGS","TB_FINDINGS","TB_TECHS",
    "TB_CHATS","TB_MESSAGES",
    "SESSIONS_RULEPACK_FIELD","SESSIONS_EQUIPMENT_FIELD","EQUIPINSTANCES_TYPE_FIELD",
  ];
  const env:boolean|Record<string,boolean> = Object.fromEntries(keys.map(k => [k, b(k)]));
  return NextResponse.json({
    ok: true,
    env,
    region: process.env.VERCEL_REGION || "unknown",
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || "unknown").slice(0,7),
    note: "booleans only; no secret values",
  });
}
