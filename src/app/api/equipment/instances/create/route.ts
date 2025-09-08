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
    console.log("[create-flow] Starting equipment instance creation");
    
    let body: any = {};
    try { body = await req.json(); } catch {}
    
    const name = (body.name || "").trim();
    const rigName = (body.rigName || "").trim();      // optional
    const rigId = body.rigId;                         // optional, direct ID
    const typeName = (body.typeName || "").trim();    // optional
    const typeId = body.typeId;                       // optional, direct ID
    const serial = (body.serial || "").trim();       // optional
    const plcDocUrl = (body.plcDocUrl || "").trim(); // optional

    if (!name) return jsonError("name is required", 422);

    // Add 15s timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const equipTbl = table(TB_EQUIPMENT_INSTANCES);

      // Resolve rig link (optional) - prefer direct ID, fallback to name lookup
      let finalRigId: string | undefined;
      if (rigId) {
        finalRigId = rigId;
      } else if (rigName) {
        const rig = await findByName(TB_RIGS, rigName, NAME_FIELD);
        if (!rig) return jsonError(`Rig not found: ${rigName}`, 422);
        finalRigId = rig.id;
      }

      // Resolve type link (optional) - prefer direct ID, fallback to name lookup
      let finalTypeId: string | undefined;
      if (typeId) {
        finalTypeId = typeId;
      } else if (typeName) {
        const typeRec = await findByName(TB_EQUIPMENT_TYPES, typeName, NAME_FIELD);
        if (!typeRec) return jsonError(`EquipmentType not found: ${typeName}`, 422);
        finalTypeId = typeRec.id;
      }

      const fields: Record<string, any> = { [NAME_FIELD]: name };
      if (finalRigId) fields[RIG_LINK_FIELD] = [finalRigId]; // Airtable link array
      if (finalTypeId) fields[EQUIPINSTANCES_TYPE_FIELD] = [finalTypeId];
      if (serial) fields.Serial = serial;
      if (plcDocUrl) fields.PLCProjectDoc = plcDocUrl;

      const created = await equipTbl.create([{ fields }]);
      const rec = created?.[0];
      if (!rec?.id) throw new Error("create returned no id");

      clearTimeout(timeoutId);
      console.log(`[create-flow] Successfully created equipment instance: ${name} (${rec.id})`);
      return NextResponse.json({
        ok: true,
        id: rec.id,
        name: name,
      }, { status: 201 });
    } catch (airtableError: any) {
      clearTimeout(timeoutId);
      if (airtableError.name === 'AbortError') {
        console.log("[create-flow] Equipment creation timed out after 15s");
        throw new Error("Request timed out - please try again");
      }
      throw airtableError;
    }
  } catch (e: any) {
    console.log(`[create-flow] Equipment creation error: ${e?.message || String(e)}`);
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}