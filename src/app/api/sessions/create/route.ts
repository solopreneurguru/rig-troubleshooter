import { NextResponse } from "next/server";
import { createSession } from "@/lib/airtable";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const problem = (body.problem ?? "").trim?.();
    if (!problem) return NextResponse.json({ ok:false, error:"Problem description is required." }, { status: 422 });
    const id = await createSession(
      "", // title - will be computed by Airtable
      problem,
      body.rigId || undefined,
      body.overrideRulePackKey || undefined,
      body.equipmentId || undefined,
      undefined // failureMode
    );
    return NextResponse.json({ ok:true, id, redirect:`/sessions/${encodeURIComponent(id)}` }, { status: 201 });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}

// Keep method guarders if you want:
export async function GET() {
  return NextResponse.json({ ok:false, error:"Method Not Allowed" }, { status: 405 });
}