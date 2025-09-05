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
    
    // Build explicit fields object and sanitize
    const fields = sanitizeFields({
      Rig: rigId ? [rigId] : undefined,
      EquipmentInstance: equipmentInstanceId ? [equipmentInstanceId] : undefined,
      Problem: problem || undefined,
      Status: "Open",
      RulePackKey: rulePackKey || undefined,
      FailureMode: failureMode || undefined,
      // DO NOT include Title - it's computed by Airtable formula
    });
    
    // Log field names for debugging
    console.log("Session create fields:", Object.keys(fields));
    
    // Ensure "Title" never appears in the fields
    if ("Title" in fields) {
      return NextResponse.json({ ok: false, error: "Title field is not allowed in session creation" }, { status: 400 });
    }
    
    const id = await createSession(
      "", // Don't pass title - it's a Formula field
      problem, 
      rigId, 
      rulePackKey,
      equipmentInstanceId,
      failureMode
    );
    return NextResponse.json({ ok: true, sessionId: id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
