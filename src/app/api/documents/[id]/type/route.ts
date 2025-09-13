import { NextResponse, NextRequest } from "next/server";
import Airtable from "airtable";
import { getTableFields } from "@/lib/airtable-metadata";
import { pickDocTypeKey } from "@/lib/classifyDoc";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TB_DOCS = process.env.TB_DOCS || "Documents";

function base() {
  Airtable.configure({ apiKey: AIRTABLE_API_KEY });
  return new Airtable().base(AIRTABLE_BASE_ID);
}

// Note the Next 15 signature: NextRequest + params: Promise<{ id: string }>
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // must await in Next 15
    const { type } = (await request.json().catch(() => ({}))) as { type?: string };

    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    if (!type) return NextResponse.json({ ok: false, error: "type required" }, { status: 400 });

    const b = base();
    const allow = await getTableFields(b, TB_DOCS);
    const typeKey = pickDocTypeKey(allow);
    if (!typeKey) {
      return NextResponse.json(
        { ok: false, error: "No doc-type field in Documents table" },
        { status: 500 }
      );
    }

    const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
      TB_DOCS
    )}`;

    const res = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ id, fields: { [typeKey]: type } }] }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: "Airtable REST update failed", status: res.status, body: text },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, id, type });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "update failed" }, { status: 500 });
  }
}