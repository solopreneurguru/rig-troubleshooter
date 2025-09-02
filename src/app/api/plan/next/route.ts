import { NextResponse } from "next/server";
import { createAction, type Step, getSessionById } from "@/lib/airtable";
import { getRulePackByKey } from "@/lib/rulepacks";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, order = 1 } = body || {};
    if (!sessionId) throw new Error("sessionId is required");
    const session = await getSessionById(sessionId);
    const rpField = (process.env.SESSIONS_RULEPACK_FIELD || "RulePackKey").trim();
    const rpKey = (session as any)[rpField];
    if (!rpKey) throw new Error(`Session missing ${rpField}; choose a rule pack when creating the session.`);
    const pack = await getRulePackByKey(String(rpKey));
    if (!pack) throw new Error(`RulePack '${rpKey}' not found or inactive.`);
    const startKey = pack.start || Object.keys(pack.nodes)[0];
    const node = pack.nodes[startKey];
    const step: Step = { key: node.key || startKey, instruction: node.instruction, expect: node.expect != null ? String(node.expect) : undefined, citation: node.citation };
    const actionId = await createAction(sessionId, order, step);
    return NextResponse.json({ ok: true, actionId, step, order });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
