import { NextResponse } from "next/server";
import { withDeadline } from "@/lib/withDeadline";
import Airtable from "airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

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
    const { sessionId, stepId, confirmedBy, checklist } = body;

    if (!sessionId || !stepId || !confirmedBy) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required fields: sessionId, stepId, confirmedBy" 
      }, { status: 400 });
    }

    const TB_ACTIONS = process.env.TB_ACTIONS;
    if (!TB_ACTIONS) {
      return NextResponse.json({ 
        ok: false, 
        error: "Actions table not configured" 
      }, { status: 500 });
    }

    const base = getBase();
    const actions = base(TB_ACTIONS);

    // Look for existing action with this session and step
    const existingActions = await withDeadline(
      actions.select({
        filterByFormula: `AND({Session} = "${sessionId}", {StepId} = "${stepId}")`,
        maxRecords: 1
      }).firstPage(),
      6000,
      'safety-find-action'
    );

    const now = new Date().toISOString();
    const checklistText = Array.isArray(checklist) ? checklist.join(', ') : '';

    const safetyFields: any = {
      SafetyConfirmedBy: confirmedBy,
      SafetyConfirmedAt: now,
      SafetyChecklist: checklistText,
      StepId: stepId
    };

    if (existingActions.length > 0) {
      // Update existing action
      const actionId = existingActions[0].id;
      await withDeadline(
        actions.update(actionId, safetyFields),
        6000,
        'safety-update-action'
      );
    } else {
      // Create new action record
      const newFields = {
        ...safetyFields,
        Session: [sessionId],
        CreatedAt: now,
        Kind: 'safety_confirmation'
      };

      await withDeadline(
        actions.create(newFields),
        6000,
        'safety-create-action'
      );
    }

    return NextResponse.json({ 
      ok: true,
      confirmedBy,
      confirmedAt: now,
      checklist: checklist || []
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
      error: e?.message || "safety confirmation failed" 
    }, { status: 500 });
  }
}
