import { NextResponse } from "next/server";
import { getSessionById, listActionsForSession, getRulePackKeyForSession } from "@/lib/airtable";
import { loadV2PackByKey, nextStepId } from "@/lib/plan_v2";

// NOTE: reuse existing airtable helpers if names differ; otherwise add thin wrappers in airtable.ts:
//   - getSessionById(id)
//   - getRulePackKeyForSession(id): returns string | null (from Sessions.RulePackKey)
//   - listActionsForSession(id): returns array ordered by CreatedAt with minimally { stepId, kind, value }

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ ok:false, error:"missing sessionId" }, { status:400 });

    const session = await getSessionById(sessionId);
    if (!session) return NextResponse.json({ ok:false, error:"session not found" }, { status:404 });

    const packKey = await getRulePackKeyForSession(sessionId);
    if (!packKey || !packKey.endsWith(".v2")) {
      return NextResponse.json({ ok:false, error:"not a v2 session" }, { status:400 });
    }

    const pack = await loadV2PackByKey(packKey);
    if (!pack) return NextResponse.json({ ok:false, error:"rule pack not found or invalid json" }, { status:404 });

    const actions = await listActionsForSession(sessionId);
    const stepId = nextStepId(pack, actions || []);
    if (!stepId) {
      return NextResponse.json({ ok:true, done:true, step:null });
    }
    const step = pack.steps[stepId];
    return NextResponse.json({ ok:true, done:false, step });
  } catch (err:any) {
    return NextResponse.json({ ok:false, error:String(err?.message||err) }, { status:500 });
  }
}