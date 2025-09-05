import { NextResponse } from "next/server";
import { createSession, findRigByName, sanitizeFields, setSessionFields } from "@/lib/airtable";

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
      undefined, // Don't pass rulePackKey here
      equipmentInstanceId,
      undefined // Don't pass failureMode here
    );
    
    // After creating the session (and before redirect), if we already know the selectedKey (from override or intake), 
    // call the update API server-side to set RulePackKey immediately, and await it. 
    // If that write fails, return {ok:false,error} to the client rather than navigating.
    if (rulePackKey) {
      try {
        const SESSIONS_RULEPACK_FIELD = process.env.SESSIONS_RULEPACK_FIELD || "RulePackKey";
        const updateFields = sanitizeFields({
          [SESSIONS_RULEPACK_FIELD]: rulePackKey,
          FailureMode: failureMode || undefined
        });
        
        const updated = await setSessionFields(id, updateFields);
        if (!updated) {
          return NextResponse.json({ ok: false, error: "Failed to set RulePackKey after session creation" }, { status: 500 });
        }
      } catch (updateError: any) {
        return NextResponse.json({ ok: false, error: `Failed to set RulePackKey: ${updateError?.message || 'Unknown error'}` }, { status: 500 });
      }
    }
    
    return NextResponse.json({ ok: true, sessionId: id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
