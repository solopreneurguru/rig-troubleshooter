import { NextResponse } from "next/server";
import { createEquipmentInstance } from "@/lib/airtable";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, rigId, typeId, serial, variantNotes, plcDocId, commissionedAt } = body || {};
    
    if (!name) {
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
    }
    
    const id = await createEquipmentInstance({
      name,
      rigId,
      typeId,
      serial,
      variantNotes,
      plcDocId,
      commissionedAt
    });
    
    // Safety log (temporary) - confirm we are not sending "Status" to EquipmentInstances
    console.log("Equip create fields:", Object.keys({ name, rigId, typeId, serial, variantNotes, plcDocId, commissionedAt }));
    
    return NextResponse.json({ ok: true, equipmentId: id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 400 });
  }
}
