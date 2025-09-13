import { NextResponse } from "next/server";

export async function GET() {
  const routeName = "/api/equipment/instances";
  const ok = (data: any, status = 200) =>
    new NextResponse(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json", "x-rt-route": routeName },
    });

  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
    const tableName =
      process.env.TB_RIG_EQUIP ||
      process.env.TB_EQUIPMENT_INSTANCES ||
      "EquipmentInstances";

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return ok(
        { ok: false, error: "Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID" },
        500
      );
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
      tableName
    )}?maxRecords=200`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      cache: "no-store",
    });
    const json = await res.json();

    if (!res.ok) {
      return ok(
        { ok: false, error: json?.error?.message || "airtable list failed" },
        500
      );
    }

    const NAME_FIELDS = ["Name","Title","Label","Equipment","Equipment Name","Description"];
    const pickName = (fields: any) => {
      for (const k of NAME_FIELDS) {
        const v = fields?.[k];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
      for (const [, v] of Object.entries(fields || {})) {
        if (typeof v === "string" && v.trim()) return v.trim();
      }
      return "Unnamed Equipment";
    };

    const items = (json.records || []).map((r: any) => ({
      id: r.id,
      name: pickName(r.fields),
    }));

    return ok({ ok: true, items, count: items.length, table: tableName });
  } catch (e: any) {
    return ok(
      { ok: false, error: e?.message || "unexpected error" },
      500
    );
  }
}