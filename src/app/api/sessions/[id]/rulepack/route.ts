import { NextResponse } from "next/server";
import { table } from "@/lib/rulepacks";

const TB_SESSIONS = process.env.TB_SESSIONS!;
const SESSIONS_RULEPACK_FIELD = process.env.SESSIONS_RULEPACK_FIELD || "RulePack";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await _.json().catch(() => ({}));
    const key = (body.key ?? "").trim?.();
    if (!key) return NextResponse.json({ ok: false, error: "key required" }, { status: 422 });
    const sessTbl = table(TB_SESSIONS);
    await sessTbl.update([{ id, fields: { [SESSIONS_RULEPACK_FIELD]: key } }]);
    return NextResponse.json({ ok: true, id, key });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
