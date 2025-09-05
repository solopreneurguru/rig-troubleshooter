import { NextResponse } from "next/server";
import { getEquipmentInstanceById } from "@/lib/airtable";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const instance = await getEquipmentInstanceById(id);
    return NextResponse.json({ ok: true, instance });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
