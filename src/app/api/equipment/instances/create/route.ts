import { NextResponse } from "next/server";
import { createEquipmentInstance } from "@/lib/airtable";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { Name, SerialNumber, EquipmentType, Rig, PLCProjectDoc, Status, Notes } = body || {};
    
    if (!Name) {
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
    }
    
    const id = await createEquipmentInstance({
      Name,
      SerialNumber,
      EquipmentType,
      Rig,
      PLCProjectDoc,
      Status,
      Notes
    });
    
    // Log field names for debugging
    console.log("Equip create fields:", Object.keys({ Name, SerialNumber, EquipmentType, Rig, PLCProjectDoc, Status, Notes }));
    
    return NextResponse.json({ ok: true, equipmentId: id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
