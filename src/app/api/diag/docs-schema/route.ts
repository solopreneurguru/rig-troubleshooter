import { NextResponse } from "next/server";
import { withDeadline } from "@/lib/withDeadline";
import { getTableFields } from "@/lib/airtable-metadata";
import Airtable from "airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

// Link field candidates (keep in sync with documents/create)
const LINK_FIELDS = [
  "RigEquipment",
  "Equipment",
  "EquipmentInstance",
  "EquipmentInstances",
  "Rig Equipment"
];

function getBase() {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  if (!API_KEY || !BASE_ID) throw new Error("Airtable env missing");
  
  Airtable.configure({ apiKey: API_KEY });
  return new Airtable().base(BASE_ID);
}

export async function GET() {
  try {
    const TB_DOCS = process.env.TB_DOCS;
    
    let fields: string[] = [];
    let chosenLink: string | null = null;

    if (TB_DOCS) {
      const base = getBase();
      const allow = await withDeadline(
        getTableFields(base, TB_DOCS),
        6000,
        'docs-schema'
      );
      fields = Array.from(allow);
      chosenLink = LINK_FIELDS.find(f => allow.has(f)) || null;
    }

    return NextResponse.json({
      ok: true,
      table: TB_DOCS ? "present" : "missing",
      fields,
      linkCandidates: LINK_FIELDS,
      chosenLink
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
      error: e?.message || "docs schema check failed" 
    }, { status: 500 });
  }
}
