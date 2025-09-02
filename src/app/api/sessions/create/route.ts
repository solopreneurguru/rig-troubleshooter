import { NextResponse } from "next/server";
import { createSession, findRigByName } from "@/lib/airtable";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, problem, rigName, rulePackKey } = body || {};
    
    let rigId: string | undefined;
    if (rigName) {
      const rig = await findRigByName(rigName);
      if (rig?.id) rigId = rig.id;
    }
    
    const id = await createSession(title || "New Session", problem, rigId, rulePackKey);
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
