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

// Common field names to try in order of preference
const NAME_FIELDS = [
  "Name",
  "Title",
  "Equipment Name",
  "Equip Name",
  "Label",
  "Equipment",
  "Description"
];

function firstStringField(fields: Record<string, unknown>): string | undefined {
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function findBestName(record: any): string {
  try {
    const fields = record.fields || {};
    
    // Try preferred field names first
    for (const field of NAME_FIELDS) {
      const value = fields[field];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    // Fall back to first string field
    const firstString = firstStringField(fields);
    if (firstString) {
      return firstString;
    }

    // Last resort: use record ID
    return record.id || "Unnamed Equipment";
  } catch (e) {
    return record.id || "Unnamed Equipment";
  }
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

    // Get all records without field filtering
    const records = await withDeadline(
      rigEquip.select({
        sort: [{ field: "Name", direction: "asc" }] // Keep sorting by Name if it exists
      }).firstPage(),
      8000,
      'list-rig-equipment'
    );

    const items = records.map((record) => ({
      id: record.id,
      name: findBestName(record)
    }));

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