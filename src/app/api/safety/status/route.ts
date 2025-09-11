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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const stepId = url.searchParams.get("stepId");

    if (!sessionId || !stepId) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required parameters: sessionId, stepId" 
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

    // Look for safety confirmation for this session and step
    const safetyActions = await withDeadline(
      actions.select({
        filterByFormula: `AND({Session} = "${sessionId}", {StepId} = "${stepId}", NOT({SafetyConfirmedBy} = ""))`,
        maxRecords: 1,
        fields: ["SafetyConfirmedBy", "SafetyConfirmedAt", "SafetyChecklist"]
      }).firstPage(),
      6000,
      'safety-status-check'
    );

    if (safetyActions.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        confirmed: false 
      });
    }

    const action = safetyActions[0];
    const checklist = action.get("SafetyChecklist") as string;
    
    return NextResponse.json({ 
      ok: true, 
      confirmed: true,
      by: action.get("SafetyConfirmedBy") as string,
      at: action.get("SafetyConfirmedAt") as string,
      checklist: checklist ? checklist.split(', ').filter(Boolean) : []
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
      error: e?.message || "safety status check failed" 
    }, { status: 500 });
  }
}
