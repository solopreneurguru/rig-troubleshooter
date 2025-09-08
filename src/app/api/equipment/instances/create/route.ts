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

    if (!name) return jsonErr("name is required", 422);

    // Use shared timeout utility with 15s deadline
    const equipTbl = table(TB_EQUIPMENT_INSTANCES);

    // Resolve rig link (optional) - prefer direct ID, fallback to name lookup
    let finalRigId: string | undefined;
    if (rigId) {
      finalRigId = rigId;
    } else if (rigName) {
      const rig = await withTimeout(
        findByName(TB_RIGS, rigName, NAME_FIELD),
        5000, // 5s for rig lookup
        () => console.error('[timeout]', '/api/equipment/instances/create', { ms: 5000, hint: 'airtable' })
      );
      if (!rig) return jsonErr(`Rig not found: ${rigName}`, 422);
      finalRigId = rig.id;
    }

    // Resolve type link (optional) - prefer direct ID, fallback to name lookup
    let finalTypeId: string | undefined;
    if (typeId) {
      finalTypeId = typeId;
    } else if (typeName) {
      const typeRec = await withTimeout(
        findByName(TB_EQUIPMENT_TYPES, typeName, NAME_FIELD),
        5000, // 5s for type lookup
        () => console.error('[timeout]', '/api/equipment/instances/create', { ms: 5000, hint: 'airtable' })
      );
      if (!typeRec) return jsonErr(`EquipmentType not found: ${typeName}`, 422);
      finalTypeId = typeRec.id;
    }

    const fields: Record<string, any> = { [NAME_FIELD]: name };
    if (finalRigId) fields[RIG_LINK_FIELD] = [finalRigId]; // Airtable link array
    if (finalTypeId) fields[EQUIPINSTANCES_TYPE_FIELD] = [finalTypeId];
    if (serial) fields.Serial = serial;
    if (plcDocUrl) fields.PLCProjectDoc = plcDocUrl;

    const created = await withTimeout(
      equipTbl.create([{ fields }]),
      15000, // 15s deadline for creation
      () => console.error('[timeout]', '/api/equipment/instances/create', { ms: 15000, hint: 'airtable' })
    );
    
    const rec = created?.[0];
    if (!rec?.id) throw new Error("create returned no id");

    console.log(`[create-flow] Successfully created equipment instance: ${name} (${rec.id})`);
    return jsonOk({ id: rec.id, name }, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'ETIMEDOUT') {
      console.error('[timeout]', '/api/equipment/instances/create', { ms: 15000, hint: 'airtable' });
      return jsonErr('upstream timeout', 504);
    }
    
    console.log(`[create-flow] Equipment creation error: ${e?.message || 'server error'}`);
    return jsonErr(e?.message || 'server error', 500);
  }
}