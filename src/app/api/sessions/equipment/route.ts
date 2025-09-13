import { NextResponse } from "next/server";
import Airtable from "airtable";

function getBase() {
  const API_KEY = process.env.AIRTABLE_API_KEY!;
  const BASE_ID = process.env.AIRTABLE_BASE_ID!;
  Airtable.configure({ apiKey: API_KEY });
  return new Airtable().base(BASE_ID);
}

const SESSION_TABLE =
  process.env.TB_SESSIONS || "Sessions";
const SESSION_EQUIP_FIELD =
  process.env.SESSIONS_EQUIPMENT_FIELD ||
  "Equipment"; // your env already points to the right link field

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || "";
    if (!id.startsWith("rec"))
      return NextResponse.json({ ok: false, error: "session id required (rec…)" }, { status: 400 });

    const base = getBase();
    const table = base(SESSION_TABLE);
    const record = await table.find(id);

    const f: any = record.fields || {};
    // Try configured link field first, then common fallbacks
    const linkCandidates = [
      SESSION_EQUIP_FIELD,
      "RigEquipment",
      "EquipmentInstance",
      "EquipmentInstances",
      "Equipment",
    ];
    const key = linkCandidates.find(k => f[k]);
    const raw = key ? f[key] : null;

    let equipmentId: string | null = null;
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      // Airtable SDK returns linked records as strings (ids) OR objects
      equipmentId =
        typeof first === "string" ? first :
        typeof first?.id === "string" ? first.id : null;
    }

    return NextResponse.json({ ok: true, equipmentId, field: key });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "failed to resolve equipment id" }, { status: 500 });
  }
}
