import { NextResponse } from "next/server";
import { getSignalsByEquipmentInstance } from "@/lib/airtable";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const signals = await getSignalsByEquipmentInstance(id);
    return NextResponse.json({ ok: true, signals });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
