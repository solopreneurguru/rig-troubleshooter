import { NextResponse } from "next/server";
import {
  createSession,
  rulePackExists,
} from "@/lib/airtable";
import { guessSymptom } from "@/lib/symptom_map";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      rigId,                 // optional (kept if your schema uses it)
      equipmentInstanceId,   // Sessions.Equipment (link to EquipmentInstances)
      problem,               // Sessions.Problem
    } = body || {};

    // Build initial fields (DO NOT send computed Title etc.)
    const fields: Record<string, any> = {};
    if (problem) fields.Problem = problem;
    if (equipmentInstanceId) fields.Equipment = [equipmentInstanceId];

    // Try to auto-select a v2 pack
    let auto = { ok: false as boolean, key: null as string | null, reason: "" as string };

    const g = guessSymptom(problem || "");
    if (g.packKey) {
      const ok = await rulePackExists(g.packKey);
      if (ok) {
        fields.RulePackKey = g.packKey;          // only write if exists + Active
        auto = { ok: true, key: g.packKey, reason: g.reason };
      } else {
        auto = { ok: false, key: g.packKey, reason: "pack_not_found_or_inactive" };
      }
    } else {
      auto = { ok: false, key: null, reason: "no_pack_from_classifier" };
    }

    const rec = await createSession(
      "", // title - will be computed by Airtable
      fields.Problem,
      undefined, // rigId
      fields.RulePackKey,
      equipmentInstanceId,
      undefined // failureMode
    );
    return NextResponse.json({ ok: true, id: rec, auto });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}