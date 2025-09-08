import { NextResponse } from "next/server";
import { table } from "@/lib/airtable";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Basic env sanity (health already does this, but fail fast here too)
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { ok: false, error: "Airtable env missing" },
        { status: 500 }
      );
    }

    const tb = table(process.env.TB_RIGS || "Rigs");
    // Return only what the picker needs
    const rows = await tb
      .select({ fields: ["Name"], pageSize: 100 })
      .all();

    const rigs = rows
      .map(r => ({ id: r.id as string, name: (r.get("Name") as string) || "" }))
      .filter(r => r.name);

    return NextResponse.json({ ok: true, rigs }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
