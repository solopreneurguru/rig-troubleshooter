import { NextResponse } from "next/server";
import { createAction, type Step } from "@/lib/airtable";
import { TOP_DRIVE_RPM_LOW } from "@/lib/rules";

export const runtime = "nodejs";

function firstStep(): Step {
  const node = TOP_DRIVE_RPM_LOW["check_main_contactor"];
  return { key: node.key, instruction: node.instruction, expect: node.expect, citation: node.citation };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, order = 1 } = body || {};
    
    if (!sessionId) throw new Error("sessionId is required");
    
    const step = firstStep();
    const actionId = await createAction(sessionId, order, step);
    
    return NextResponse.json({ ok: true, actionId, step, order });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
