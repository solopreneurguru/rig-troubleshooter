import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rec = url.searchParams.get("rec")?.trim();
    const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 25)));
    if (!rec) {
      return NextResponse.json({ ok: false, error: "rec parameter required (equipment id)" }, { status: 400 });
    }

    const API_KEY = process.env.AIRTABLE_API_KEY;
    const BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_ID = process.env.TB_DOCS || "Documents";

    if (!API_KEY || !BASE_ID) {
      return NextResponse.json(
        { ok: false, error: "Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID" },
        { status: 500 }
      );
    }

    // Use Airtable REST API directly
    const apiUrl = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_ID)}`;
    const res = await fetch(`${apiUrl}?filterByFormula=FIND("${rec}",ARRAYJOIN({Equipment}))&maxRecords=${limit}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    // Always try to parse response as JSON first
    let data: any;
    try {
      data = await res.json();
    } catch (e) {
      // If not JSON, include a snippet of the response
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { 
          ok: false, 
          error: "Airtable response was not JSON",
          detail: text.slice(0, 160)
        },
        { status: 502 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { 
          ok: false, 
          error: "Airtable request failed",
          status: res.status,
          detail: data?.error?.message || String(data?.error || "")
        },
        { status: 502 }
      );
    }

    // Transform records to our format
    const items = (data.records || []).map((r: any) => ({
      id: r.id,
      title: r.fields.Title || r.fields.Name || "Untitled Document",
      type: r.fields.DocType || "Other",
      url: r.fields.BlobURL || r.fields.URL || "",
    }));

    // Get unique types for filtering
    const types = Array.from(new Set(items.map((i: { type: string }) => i.type))).sort();

    return NextResponse.json({ ok: true, items, types }, { status: 200 });
  } catch (err: any) {
    const msg = err?.message || String(err);
    return NextResponse.json(
      { ok: false, error: "by-equipment failed", detail: msg },
      { status: 500 }
    );
  }
}