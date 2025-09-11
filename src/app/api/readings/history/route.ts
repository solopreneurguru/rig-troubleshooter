import { NextResponse } from "next/server";
import { withDeadline } from "@/lib/withDeadline";
import { normalizeUnit, convertUnit, Unit } from "@/lib/measure";
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const stepId = url.searchParams.get("stepId");
    const stepUnit = url.searchParams.get("stepUnit") || "V";

    if (!sessionId || !stepId) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required parameters: sessionId, stepId" 
      }, { status: 400 });
    }

    const TB_READINGS = process.env.TB_READINGS;
    if (!TB_READINGS) {
      return NextResponse.json({ 
        ok: false, 
        error: "Readings table not configured" 
      }, { status: 500 });
    }

    const base = getBase();
    const readings = base(TB_READINGS);

    // Query readings for this session and step
    const readingRecords = await withDeadline(
      readings.select({
        filterByFormula: `AND({Session} = "${sessionId}", {StepId} = "${stepId}")`,
        sort: [{ field: "CreatedAt", direction: "asc" }],
        fields: ["Value", "Unit", "Pass", "CreatedAt", "Note"]
      }).firstPage(),
      8000,
      'readings-history'
    );

    const normalizedStepUnit = normalizeUnit(stepUnit) as Unit;
    
    const rows = readingRecords.map((record) => {
      const valueRaw = record.get("Value") as number;
      const unitRaw = record.get("Unit") as string || stepUnit;
      const pass = record.get("Pass") as boolean;
      const createdAt = record.get("CreatedAt") as string;
      const note = record.get("Note") as string;

      // Convert to step unit if possible
      const normalizedUnitRaw = normalizeUnit(unitRaw) as Unit;
      const value = convertUnit(valueRaw, normalizedUnitRaw, normalizedStepUnit);

      return {
        id: record.id,
        valueRaw,
        unitRaw,
        value: Math.round(value * 1000) / 1000, // Round to 3 decimal places
        pass,
        createdAt,
        note: note || ""
      };
    });

    return NextResponse.json({ 
      ok: true, 
      unit: normalizedStepUnit,
      rows,
      count: rows.length,
      passRate: rows.length > 0 ? Math.round((rows.filter(r => r.pass).length / rows.length) * 100) : 0
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
      error: e?.message || "readings history failed" 
    }, { status: 500 });
  }
}
