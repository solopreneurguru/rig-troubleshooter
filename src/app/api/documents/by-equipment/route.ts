import { NextResponse } from "next/server";
import { getAirtableEnv } from "@/lib/env";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  console.log("api_start", { route: "documents/by-equipment", time: new Date().toISOString() });

  try {
    const A = getAirtableEnv();
    const url = new URL(req.url);
    const equipmentId = url.searchParams.get("equipmentId");
    if (!equipmentId) {
      return NextResponse.json({ ok: false, error: "equipmentId required" }, { status: 400 });
    }

    const baseUrl = `https://api.airtable.com/v0/${A.baseId}/${encodeURIComponent(A.tables.docs)}`;
    const q = new URLSearchParams();
    q.set("filterByFormula", `{Equipment} = '${equipmentId}'`);
    q.set("sort[0][field]", "CreatedTime");
    q.set("sort[0][direction]", "desc");

    const res = await fetch(`${baseUrl}?${q.toString()}`, {
      headers: { Authorization: `Bearer ${A.key}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: "Airtable list failed", status: res.status, body: text },
        { status: 502 }
      );
    }

    const json = await res.json();
    return NextResponse.json({ ok: true, items: json.records || [] });
  } catch (err) {
    console.error("api_error", { route: "documents/by-equipment", err: String(err), stack: (err as any)?.stack });
    return NextResponse.json({ 
      error: 'DOC_LIST_FAILED', 
      detail: String(err) 
    }, { status: 500 });
  }
}