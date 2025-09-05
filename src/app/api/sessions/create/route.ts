import { NextResponse } from "next/server";
import { createSession, findRigByName, sanitizeFields } from "@/lib/airtable";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Extract only the fields we expect - do NOT forward request body directly
    const { rigName, equipmentInstanceId, problem, rulePackKey, failureMode } = body || {};
    
    // Validate required fields
    if (!problem?.trim()) {
      return NextResponse.json({ ok: false, error: "Problem description is required" }, { status: 400 });
    }
    
    let rigId: string | undefined;
    if (rigName) {
      const rig = await findRigByName(rigName);
      if (rig?.id) rigId = rig.id;
    }
    
    // Ensure fields are only: { Rig: [rigId], [SESS_EQUIP_FIELD]: [equipmentId], Problem, Status:"Open" }
    // Title must NOT be sent.
    const fields = sanitizeFields({
      Rig: rigId ? [rigId] : undefined,
      EquipmentInstance: equipmentInstanceId ? [equipmentInstanceId] : undefined,
      Problem: problem || undefined,
      Status: "Open"
      // DO NOT include Title - it's computed by Airtable formula
      // DO NOT include RulePackKey or FailureMode here - they'll be set later via update
    });
    
    // Ensure "Title" never appears in the fields
    if ("Title" in fields) {
      return NextResponse.json({ ok: false, error: "Title field is not allowed in session creation" }, { status: 400 });
    }
    
    const id = await createSession(
      "", // Don't pass title - it's a Formula field
      problem, 
      rigId, 
      rulePackKey, // Pass rulePackKey through to createSession
      equipmentInstanceId,
      failureMode // Pass failureMode through to createSession
    );
    
    // RulePackKey and FailureMode are now set directly in createSession()
    
    return NextResponse.json({ ok: true, sessionId: id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
