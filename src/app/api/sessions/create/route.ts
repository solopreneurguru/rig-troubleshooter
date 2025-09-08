import { NextResponse } from "next/server";
import { createSession, rulePackExists } from "@/lib/airtable";
import { guessSymptom } from "@/lib/symptom_map";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rigId = (body.rigId ?? "").trim?.() || undefined;             // optional
    const equipmentId = (body.equipmentInstanceId ?? body.equipmentId ?? "").trim?.() || undefined; // recommended
    const problem = (body.problem ?? "").trim?.();
    const overrideRulePackKey = (body.overrideRulePackKey ?? body.rulePackKey ?? "").trim?.() || undefined;

    if (!problem) {
      return NextResponse.json({ ok:false, error:"Problem description is required." }, { status: 422 });
    }

    // Try to auto-select a v2 pack
    let auto = { ok: false as boolean, key: null as string | null, reason: "" as string };
    let chosenRulePackKey = overrideRulePackKey;

    if (!chosenRulePackKey) {
      const g = guessSymptom(problem || "");
      if (g.packKey) {
        const ok = await rulePackExists(g.packKey);
        if (ok) {
          chosenRulePackKey = g.packKey;
          auto = { ok: true, key: g.packKey, reason: g.reason };
        } else {
          auto = { ok: false, key: g.packKey, reason: "pack_not_found_or_inactive" };
        }
      } else {
        auto = { ok: false, key: null, reason: "no_pack_from_classifier" };
      }
    }

    // Create session using existing function
    const id = await createSession(
      "", // title - will be computed by Airtable
      problem,
      rigId,
      chosenRulePackKey,
      equipmentId,
      undefined // failureMode
    );

    const redirect = `/sessions/${encodeURIComponent(id)}`;
    return NextResponse.json({ ok:true, id, redirect, sessionId: id, auto }, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || String(e);
    return NextResponse.json({ ok:false, error: msg }, { status: 500 });
  }
}

// Keep method guarders if you want:
export async function GET() {
  return NextResponse.json({ ok:false, error:"Method Not Allowed" }, { status: 405 });
}