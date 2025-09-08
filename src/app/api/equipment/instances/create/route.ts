import { NextResponse } from "next/server";
import { table, findByName } from "@/lib/airtable";

const TB_RIGS = process.env.TB_RIGS!;
const TB_EQUIPMENT_INSTANCES = process.env.TB_EQUIPMENT_INSTANCES!;
const TB_EQUIPMENT_TYPES = process.env.TB_EQUIPMENT_TYPES!;
const EQUIPINSTANCES_TYPE_FIELD = process.env.EQUIPINSTANCES_TYPE_FIELD || "Type"; // link-to-record field on EquipmentInstances
const NAME_FIELD = "Name"; // standard name field
const RIG_LINK_FIELD = "Rig"; // link-to-record field on EquipmentInstances to the Rigs table

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch {}
    const name = (body.name || "").trim();
    const rigName = (body.rigName || "").trim();      // optional
    const typeName = (body.typeName || "").trim();    // optional

    if (!name) return jsonError("name is required", 422);

    const equipTbl = table(TB_EQUIPMENT_INSTANCES);

    // Resolve rig link (optional)
    let rigId: string | undefined;
    if (rigName) {
      const rig = await findByName(TB_RIGS, rigName, NAME_FIELD);
      if (!rig) return jsonError(`Rig not found: ${rigName}`, 422);
      rigId = rig.id;
    }

    // Resolve type link (optional)
    let typeId: string | undefined;
    if (typeName) {
      const typeRec = await findByName(TB_EQUIPMENT_TYPES, typeName, NAME_FIELD);
      if (!typeRec) return jsonError(`EquipmentType not found: ${typeName}`, 422);
      typeId = typeRec.id;
    }

    const fields: Record<string, any> = { [NAME_FIELD]: name };
    if (rigId) fields[RIG_LINK_FIELD] = [rigId]; // Airtable link array
    if (typeId) fields[EQUIPINSTANCES_TYPE_FIELD] = [typeId];

    const created = await equipTbl.create([{ fields }]);
    const rec = created?.[0];
    if (!rec?.id) throw new Error("create returned no id");

    return NextResponse.json({
      ok: true,
      id: rec.id,
      fields: rec.fields,
    }, { status: 201 });
  } catch (e: any) {
    console.error("[equipment/create] error", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}