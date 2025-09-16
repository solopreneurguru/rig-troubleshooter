import { NextResponse } from "next/server";
import { withDeadline } from "@/lib/withDeadline";
import { normalizeUnit, parseSpec, evaluate, formatSpec } from "@/lib/measure";
import { getSessionById, getRulePackKeyForSession } from "@/lib/airtable";
import { loadV2PackByKey } from "@/lib/plan_v2";
import Airtable from "airtable";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getBase() {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  if (!API_KEY || !BASE_ID) throw new Error("Airtable env missing");
  
  Airtable.configure({ apiKey: API_KEY });
  return new Airtable().base(BASE_ID);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, stepId, reading } = body;

    if (!sessionId || !stepId) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required fields: sessionId, stepId" 
      }, { status: 400 });
    }

    // Get session and rulepack to validate step
    const session = await withDeadline(getSessionById(sessionId), 6000, 'get-session');
    if (!session) {
      return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
    }

    const packKey = await withDeadline(getRulePackKeyForSession(sessionId), 6000, 'get-pack-key');
    if (!packKey || !packKey.endsWith(".v2")) {
      return NextResponse.json({ ok: false, error: "Not a v2 session" }, { status: 400 });
    }

    const pack = await withDeadline(loadV2PackByKey(packKey), 6000, 'load-pack');
    if (!pack) {
      return NextResponse.json({ ok: false, error: "Rule pack not found" }, { status: 404 });
    }

    const step = pack.steps[stepId];
    if (!step) {
      return NextResponse.json({ ok: false, error: "Step not found" }, { status: 404 });
    }

    // Handle measure steps
    if ((step as any).kind === "measure" && reading) {
      const { value, unit: rawUnit, note } = reading;
      
      if (typeof value !== "number") {
        return NextResponse.json({ 
          ok: false, 
          error: "Reading value must be a number" 
        }, { status: 400 });
      }

      const measure = (step as any).measure;
      if (!measure) {
        return NextResponse.json({ 
          ok: false, 
          error: "Step missing measure specification" 
        }, { status: 400 });
      }

      // Normalize unit and parse spec
      const unit = normalizeUnit(rawUnit || measure.unit);
      const spec = parseSpec(measure.expect, unit);
      const pass = evaluate(value, spec);

      // Record reading in Airtable
      const TB_READINGS = process.env.TB_READINGS;
      if (TB_READINGS) {
        const base = getBase();
        const readings = base(TB_READINGS);

        const readingFields: any = {
          Session: [sessionId],
          StepId: stepId,
          Value: value,
          Unit: unit,
          Pass: pass,
          Spec: measure.expect,
          Points: measure.points || "",
          Note: note || "",
          CreatedAt: new Date().toISOString()
        };

        // Add spec bounds if parsed
        if (spec.min !== undefined) readingFields.SpecMin = spec.min;
        if (spec.max !== undefined) readingFields.SpecMax = spec.max;
        if (spec.exact !== undefined) readingFields.SpecExact = spec.exact;

        await withDeadline(
          readings.create(readingFields),
          6000,
          'create-reading'
        );
      }

      // Determine next step
      const nextStepId = pass ? measure.passNext : measure.failNext;

      return NextResponse.json({ 
        ok: true, 
        pass, 
        nextStepId,
        reading: {
          value,
          unit,
          spec: formatSpec(spec, unit),
          pass
        }
      });
    }

    // Handle other step types (non-measure)
    // For now, just return success without specific next step logic
    return NextResponse.json({ 
      ok: true, 
      nextStepId: null // Let client handle navigation
    });

  } catch (e: any) {
    if (e?.message?.includes('deadline')) {
      return NextResponse.json({ 
        ok: false, 
        error: 'deadline', 
        label: e.message 
      }, { status: 503 });
    }
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "submit failed" 
    }, { status: 500 });
  }
}