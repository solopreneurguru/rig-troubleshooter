import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET() {
  try {
    const apiKey = process.env.AIRTABLE_API_KEY?.trim();
    const baseId = process.env.AIRTABLE_BASE_ID;
    const rpTableId = process.env.TB_RULEPACKS;
    
    return NextResponse.json({ 
      ok: true, 
      hasApiKey: !!apiKey,
      hasBaseId: !!baseId,
      hasTableId: !!rpTableId,
      tableId: rpTableId
    });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
