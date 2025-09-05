import { NextResponse } from "next/server";
import { setSessionFields, sanitizeFields } from "@/lib/airtable";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, RulePackKey, FailureMode, ...otherFields } = body;
    
    if (!sessionId) return NextResponse.json({ ok:false, error:"sessionId required" }, { status:400 });
    
    // Map RulePackKey coming in the body to the env field
    const SESSIONS_RULEPACK_FIELD = process.env.SESSIONS_RULEPACK_FIELD || "RulePackKey";
    
    // Build fields object
    const fields: any = {};
    
    // if body.RulePackKey present:
    if (RulePackKey !== undefined) {
      fields[SESSIONS_RULEPACK_FIELD] = RulePackKey;
    }
    
    // Add other fields if present
    if (FailureMode !== undefined) {
      fields.FailureMode = FailureMode;
    }
    
    // Add any other fields from the request
    Object.assign(fields, otherFields);
    
    // Sanitize fields using BLOCKED_FIELDS. Never touch Title/CreatedAt/Attachments.
    const sanitizedFields = sanitizeFields(fields);
    const updated = await setSessionFields(sessionId, sanitizedFields);
    return NextResponse.json({ ok: true, updated });
  } catch (e:any) {
    // When Airtable returns an error like "Unknown field name …" or "Insufficient permissions to create new select option …", 
    // return { ok:false, error } and status 400 so the client can show it
    const errorMessage = e?.message ?? "unknown";
    const isAirtableError = errorMessage.includes("Unknown field name") || 
                           errorMessage.includes("Insufficient permissions to create new select option") ||
                           errorMessage.includes("Field") && errorMessage.includes("does not exist");
    
    return NextResponse.json({ 
      ok: false, 
      error: errorMessage 
    }, { 
      status: isAirtableError ? 400 : 500 
    });
  }
}
