import { NextResponse } from "next/server";
import { getRecentFindingsByEquipmentTypeAndFailureMode } from "@/lib/airtable";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const equipmentType = searchParams.get('equipmentType');
    const failureMode = searchParams.get('failureMode');
    
    if (!equipmentType || !failureMode) {
      return NextResponse.json({ ok: false, error: "equipmentType and failureMode are required" }, { status: 400 });
    }
    
    const findings = await getRecentFindingsByEquipmentTypeAndFailureMode(equipmentType, failureMode);
    return NextResponse.json({ ok: true, findings });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
