import { NextResponse } from "next/server";
import { createAction, createReading, updateActionResult, type Step, getSessionById } from "@/lib/airtable";
import { getRulePackByKey, type RPNode } from "@/lib/rulepacks";
export const runtime = "nodejs";

function autoPass(node: RPNode, raw: any): boolean | null {
  const val = Number(raw);
  if (!isFinite(val)) return null;
  if (node.min != null || node.max != null) {
    if (node.min != null && val < node.min) return false;
    if (node.max != null && val > node.max) return false;
    return true;
  }
  if (node.expect != null) {
    const tol = node.tolerance ?? 0;
    return Math.abs(val - node.expect) <= tol;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, actionId, stepKey, value, pass, unit, order } = body || {};
    if (!sessionId || !actionId || !stepKey) throw new Error("sessionId, actionId, stepKey are required");

    const session = await getSessionById(sessionId);
    const rpField = (process.env.SESSIONS_RULEPACK_FIELD || "RulePackKey").trim();
    const rpKey = (session as any)[rpField];
    const pack = await getRulePackByKey(String(rpKey));
    if (!pack) throw new Error(`RulePack '${rpKey}' not found or inactive.`);
    const node = pack.nodes[stepKey] as RPNode | undefined;
    if (!node) throw new Error(`Node '${stepKey}' not found in pack '${rpKey}'`);

    // Record reading
    await createReading(actionId, String(value ?? ""), unit, pass ? "pass":"fail");

    // Finalize current action
    const computed = autoPass(node, value);
    const finalPass = typeof pass === "boolean" ? pass : (computed ?? false);
    await updateActionResult(actionId, finalPass ? "pass" : "fail");

    // Next node
    const nextKey = finalPass ? node.passNext : node.failNext;
    if (!nextKey || !pack.nodes[nextKey] || nextKey === "done") {
      return NextResponse.json({ ok: true, done: true });
    }
    const n = pack.nodes[nextKey];
    const nextStep: Step = { key: n.key || nextKey, instruction: n.instruction, expect: n.expect != null ? String(n.expect) : undefined, citation: n.citation };
    const nextActionId = await createAction(sessionId, (order || 1) + 1, nextStep);
    return NextResponse.json({ ok: true, actionId: nextActionId, step: nextStep, order: (order || 1) + 1 });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
