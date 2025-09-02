import { NextResponse } from "next/server";
import { listRulePacks } from "@/lib/rulepacks";
export const runtime = "nodejs";
export async function GET() {
  try { const packs = await listRulePacks(); return NextResponse.json({ ok: true, packs }); }
  catch (e:any) { return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 }); }
}
