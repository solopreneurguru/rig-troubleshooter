import { NextResponse } from "next/server";
import { getRulePackKeyForSession, appendAction } from "@/lib/airtable";
import { loadV2PackByKey, evaluateMeasure } from "@/lib/plan_v2";

// Optional: if you have addReading helper, import it; else leave commented.
// import { addReading } from "@/lib/airtable";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, stepId, kind, value } = body || {};
    if (!sessionId || !stepId || !kind) {
      return NextResponse.json({ ok:false, error:"missing params" }, { status:400 });
    }

    const packKey = await getRulePackKeyForSession(sessionId);
    if (!packKey || !packKey.endsWith(".v2")) {
      return NextResponse.json({ ok:false, error:"not a v2 session" }, { status:400 });
    }
    const pack = await loadV2PackByKey(packKey);
    const step = pack?.steps?.[stepId];
    if (!step) return NextResponse.json({ ok:false, error:"step not found" }, { status:404 });

    let actionOk: boolean | undefined = undefined;
    let actionValue: any = value;

    if (step.type === "safetyGate") {
      const confirmed = !!(value?.confirmed || value === true);
      if (!confirmed && step.requireConfirm !== false) {
        return NextResponse.json({ ok:false, error:"safety not confirmed" }, { status:400 });
      }
      actionValue = { confirmed: confirmed === true };
    }

    if (step.type === "measure") {
      const numeric = Number(value);
      if (Number.isNaN(numeric)) {
        return NextResponse.json({ ok:false, error:"measure requires numeric value" }, { status:400 });
      }
      actionOk = evaluateMeasure(step as any, numeric);
      // Optionally persist to Readings if you have a helper; otherwise only Actions.
      // try { await addReading(sessionId, stepId, numeric, step.unit, actionOk); } catch {}
    }

    await appendAction(sessionId, { stepId, kind, value: actionValue, ok: actionOk });
    return NextResponse.json({ ok:true });
  } catch (err:any) {
    return NextResponse.json({ ok:false, error:String(err?.message||err) }, { status:500 });
  }
}