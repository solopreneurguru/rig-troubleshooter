import { NextResponse } from "next/server";
import { updateActionHazardConfirm } from "@/lib/airtable";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { actionId, hazardNote, techId } = body || {};
    
    if (!actionId || !techId) {
      return NextResponse.json({ ok: false, error: "actionId and techId are required" }, { status: 400 });
    }

    const confirmedAt = new Date().toISOString();
    
    await updateActionHazardConfirm(actionId, {
      confirmedById: techId,
      confirmedAt,
      hazardNote: hazardNote || undefined,
    });
    
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
