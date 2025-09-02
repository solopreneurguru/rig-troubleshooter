import { NextResponse } from "next/server";
import { createAction, createReading, updateActionResult, type Step } from "@/lib/airtable";
import { TOP_DRIVE_RPM_LOW } from "@/lib/rules";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, actionId, stepKey, value, pass, unit, order } = body || {};
    
    if (!sessionId || !actionId || !stepKey) {
      throw new Error("sessionId, actionId, stepKey are required");
    }

    // record reading + finalize the previous action
    await createReading(actionId, String(value ?? ""), unit, pass ? "pass" : "fail");
    await updateActionResult(actionId, pass ? "pass" : "fail");

    // compute next
    const node = TOP_DRIVE_RPM_LOW[stepKey];
    const nextKey = pass ? node?.passNext : node?.failNext;
    
    if (!nextKey || nextKey === "done") {
      return NextResponse.json({ ok: true, done: true });
    }
    
    const n = TOP_DRIVE_RPM_LOW[nextKey];
    const nextStep: Step = { key: n.key, instruction: n.instruction, expect: n.expect, citation: n.citation };
    const nextActionId = await createAction(sessionId, (order || 1) + 1, nextStep);
    
    return NextResponse.json({ ok: true, actionId: nextActionId, step: nextStep, order: (order || 1) + 1 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
