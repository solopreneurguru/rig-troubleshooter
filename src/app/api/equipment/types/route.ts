import { NextResponse } from "next/server";
import { listEquipmentTypes } from "@/lib/airtable";

export const runtime = "nodejs";

export async function GET() {
  try {
    const types = await listEquipmentTypes();
    return NextResponse.json({ ok: true, types });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
