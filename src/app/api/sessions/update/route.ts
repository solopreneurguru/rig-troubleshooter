import { NextResponse } from "next/server";
import { setSessionFields, sanitizeFields } from "@/lib/airtable";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, fields } = body || {};
    
    if (!sessionId || !fields) {
      return NextResponse.json({ ok: false, error: "sessionId and fields are required" }, { status: 400 });
    }
    
    // Sanitize fields before sending to Airtable
    const sanitizedFields = sanitizeFields(fields);
    
    // Hard-block Title field if it somehow gets through
    if ("Title" in sanitizedFields) {
      delete sanitizedFields.Title;
    }
    
    await setSessionFields(sessionId, sanitizedFields);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
