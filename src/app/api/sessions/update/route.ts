import { NextResponse } from "next/server";
import { setSessionFields, sanitizeFields } from "@/lib/airtable";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { sessionId, fields } = await req.json();
    if (!sessionId || !fields) return NextResponse.json({ ok:false, error:"sessionId and fields required" }, { status:400 });
    
    // Safety log (temporary) - confirm we are sending RulePackKey to Sessions
    console.log("Session update fields:", Object.keys(fields));
    
    // sanitizeFields() should already drop Title/CreatedAt/Attachments
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
