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

export async function GET() {
  try {
    const TB_RIG_EQUIP = process.env.TB_RIG_EQUIP;
    if (!TB_RIG_EQUIP) {
      return NextResponse.json({ 
        ok: false, 
        error: "RigEquipment table not configured" 
      }, { status: 500 });
    }

    const base = getBase();
    const rigEquip = base(TB_RIG_EQUIP);

    // Get all rig equipment with basic info
    const records = await withDeadline(
      rigEquip.select({
        fields: ["Name", "EquipmentType", "Rig"],
        sort: [{ field: "Name", direction: "asc" }]
      }).firstPage(),
      8000,
      'list-rig-equipment'
    );

    const items = records.map((record) => {
      const name = record.get("Name") as string || "Unnamed Equipment";
      const equipType = record.get("EquipmentType") as string || "";
      const rig = (record.get("Rig") as any[])?.[0]?.name || "";
      const label = rig ? `${rig} — ${name}` : name;
      
      return {
        id: record.id,
        name: label,
        equipmentType: equipType
      };
    });

    return NextResponse.json({
      ok: true,
      items,
      count: items.length
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
      error: e?.message || "rig equipment list failed" 
    }, { status: 500 });
  }
}