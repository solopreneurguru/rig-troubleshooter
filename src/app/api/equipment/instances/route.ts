import { NextResponse } from "next/server";
import { listEquipmentInstances } from "@/lib/airtable";

export const runtime = "nodejs";

export async function GET() {
  try {
    const instances = await listEquipmentInstances();
    return NextResponse.json({ ok: true, instances });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
