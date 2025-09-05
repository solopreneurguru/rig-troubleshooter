import { NextResponse } from "next/server";
import { setSessionFields, sanitizeFields } from "@/lib/airtable";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { sessionId, fields } = await req.json();
    if (!sessionId || !fields) return NextResponse.json({ ok:false, error:"sessionId and fields required" }, { status:400 });
    
    // sanitizeFields() should already drop Title/CreatedAt/Attachments
    const updated = await setSessionFields(sessionId, sanitizeFields(fields));
    return NextResponse.json({ ok: true, updated });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message ?? "unknown" }, { status:500 });
  }
}
