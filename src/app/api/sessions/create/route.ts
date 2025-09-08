import { NextResponse } from "next/server";
import { createSession } from "@/lib/airtable";

export async function POST(req: Request) {
  try {
    console.log("[create-flow] Starting session creation");
    
    const body = await req.json().catch(() => ({}));
    const problem = (body.problem ?? "").trim?.();
    if (!problem) return NextResponse.json({ ok:false, error:"Problem description is required." }, { status: 422 });
    
    // Add 15s timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const id = await createSession(
        "", // title - will be computed by Airtable
        problem,
        body.rigId || undefined,
        body.overrideRulePackKey || undefined,
        body.equipmentId || undefined,
        undefined // failureMode
      );
      
      clearTimeout(timeoutId);
      console.log(`[create-flow] Successfully created session: ${id}`);
      return NextResponse.json({ ok:true, id, redirect:`/sessions/${encodeURIComponent(id)}` }, { status: 201 });
    } catch (airtableError: any) {
      clearTimeout(timeoutId);
      if (airtableError.name === 'AbortError') {
        console.log("[create-flow] Session creation timed out after 15s");
        throw new Error("Request timed out - please try again");
      }
      throw airtableError;
    }
  } catch (e:any) {
    console.log(`[create-flow] Session creation error: ${e?.message || String(e)}`);
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}

// Keep method guarders if you want:
export async function GET() {
  return NextResponse.json({ ok:false, error:"Method Not Allowed" }, { status: 405 });
}