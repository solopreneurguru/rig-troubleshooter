import { table, findByName } from "@/lib/airtable";
import { withTimeout, jsonOk, jsonErr } from "@/lib/http";

const TB_RIGS = process.env.TB_RIGS!;
const TB_EQUIPMENT_INSTANCES = process.env.TB_EQUIPMENT_INSTANCES!;
const TB_EQUIPMENT_TYPES = process.env.TB_EQUIPMENT_TYPES!;
const EQUIPINSTANCES_TYPE_FIELD = process.env.EQUIPINSTANCES_TYPE_FIELD || "Type"; // link-to-record field on EquipmentInstances
const NAME_FIELD = "Name"; // standard name field
const RIG_LINK_FIELD = "Rig"; // link-to-record field on EquipmentInstances to the Rigs table

export async function POST(req: Request) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch {}
    
    const name = (body.name || "").trim();
    const rigName = (body.rigName || "").trim();
    const rigId = body.rigId;
    const typeName = (body.typeName || "").trim();
    const typeId = body.typeId;
    const serial = (body.serial || "").trim();
    const plcDocUrl = (body.plcDocUrl || "").trim();

    if (!name) return jsonErr("name is required", 422);

    const equipTbl = table(TB_EQUIPMENT_INSTANCES);

    let finalRigId: string | undefined;
    if (rigId) {
      finalRigId = rigId;
    } else if (rigName) {
      const rig = await withTimeout(
        findByName(TB_RIGS, rigName, NAME_FIELD),
        20000
      );
      if (!rig) return jsonErr(`Rig not found: ${rigName}`, 422);
      finalRigId = rig.id;
    }

    let finalTypeId: string | undefined;
    if (typeId) {
      finalTypeId = typeId;
    } else if (typeName) {
      const typeRec = await withTimeout(
        findByName(TB_EQUIPMENT_TYPES, typeName, NAME_FIELD),
        20000
      );
      if (!typeRec) return jsonErr(`EquipmentType not found: ${typeName}`, 422);
      finalTypeId = typeRec.id;
    }

    const fields: Record<string, any> = { [NAME_FIELD]: name };
    if (finalRigId) fields[RIG_LINK_FIELD] = [finalRigId];
    if (finalTypeId) fields[EQUIPINSTANCES_TYPE_FIELD] = [finalTypeId];
    if (serial) fields.Serial = serial;
    if (plcDocUrl) fields.PLCProjectDoc = plcDocUrl;

    const created = await withTimeout(
      equipTbl.create([{ fields }]),
      20000
    );
    
    const rec = created?.[0];
    if (!rec?.id) throw new Error("create returned no id");

    return jsonOk({ id: rec.id, name }, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'ETIMEDOUT') {
      console.error('[timeout]', '/api/equipment/instances/create', { hint: 'airtable' });
      return jsonErr('upstream timeout', 504);
    }
    return jsonErr(e?.message || 'server error', 500);
  }
}