import { NextResponse } from "next/server";
import { table } from "@/lib/airtable";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("[create-flow] Starting rigs list fetch");
    
    // Basic env sanity (health already does this, but fail fast here too)
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      console.log("[create-flow] Missing Airtable env keys");
      return NextResponse.json(
        { ok: false, error: "Airtable env missing" },
        { status: 500 }
      );
    }

    // Add 10s timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const tb = table(process.env.TB_RIGS || "Rigs");
      // Return only what the picker needs
      const rows = await tb
        .select({ fields: ["Name"], pageSize: 100 })
        .all();

      const rigs = rows
        .map(r => ({ id: r.id as string, name: (r.get("Name") as string) || "" }))
        .filter(r => r.name);

      clearTimeout(timeoutId);
      console.log(`[create-flow] Successfully fetched ${rigs.length} rigs`);
      return NextResponse.json({ ok: true, rigs }, { status: 200 });
    } catch (airtableError: any) {
      clearTimeout(timeoutId);
      if (airtableError.name === 'AbortError') {
        console.log("[create-flow] Rigs list fetch timed out after 10s");
        throw new Error("Request timed out - please try again");
      }
      throw airtableError;
    }
  } catch (e: any) {
    console.log(`[create-flow] Rigs list error: ${e?.message || String(e)}`);
    return NextResponse.json(
      { ok: false, error: e?.message || "list rigs failed" },
      { status: 500 }
    );
  }
}
