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
    const TB_RIGS = process.env.TB_RIGS;
    if (!TB_RIGS) {
      return NextResponse.json({ 
        ok: false, 
        error: "Rigs table not configured" 
      }, { status: 500 });
    }

    const base = getBase();
    const rigs = base(TB_RIGS);

    // Get all rigs with basic info (Location is optional)
    const rigRecords = await withDeadline(
      rigs.select({
        fields: ["Name"],
        sort: [{ field: "Name", direction: "asc" }]
      }).firstPage(),
      8000,
      'list-rigs'
    );

    const rigList = rigRecords.map((record) => ({
      id: record.id,
      name: record.get("Name") as string || "Unnamed Rig"
    }));

    return NextResponse.json({
      ok: true,
      rigs: rigList,
      count: rigList.length
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
      error: e?.message || "rigs list failed" 
    }, { status: 500 });
  }
}
