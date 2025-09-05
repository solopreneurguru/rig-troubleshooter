import { NextResponse } from "next/server";
import { table, normalize } from "@/lib/airtable";
// If you have explicit table id exports, import them; otherwise use process.env.TB_* ids:
const RULEPACKS_ID = process.env.TB_RULEPACKS!;
const EQUIPTYPES_ID = process.env.TB_EQUIPMENT_TYPES || process.env.TB_EQUIP_TYPES;

const SAMPLE = {
  key: "topdrive.wont_start.v2",
  version: 2,
  start: "safety_loto",
  steps: {
    safety_loto: {
      id: "safety_loto",
      type: "safetyGate",
      text: "De-energize per LOTO and wear arc-flash PPE before opening cabinet.",
      hazardNote: "High energy circuit; confirm isolation.",
      requireConfirm: true,
      next: "main_contactor_engage"
    },
    main_contactor_engage: {
      id: "main_contactor_engage",
      type: "ask",
      text: "When Start is commanded, does the main contactor engage?",
      yes: "measure_dc_bus",
      no: "inspect_contactor_coil"
    },
    inspect_contactor_coil: {
      id: "inspect_contactor_coil",
      type: "info",
      text: "Inspect contactor coil wiring and PLC output. Correct faults then continue.",
      next: "measure_dc_bus"
    },
    measure_dc_bus: {
      id: "measure_dc_bus",
      type: "measure",
      text: "Measure DC bus voltage at the drive input.",
      unit: "V",
      okIf: { op: ">=", value: 480 },
      passNext: "end_power_ok",
      failNext: "end_power_issue"
    },
    end_power_ok: { id: "end_power_ok", type: "end", text: "Power path OK. Proceed to control logic checks." },
    end_power_issue: { id: "end_power_issue", type: "end", text: "Power issue suspected. Inspect upstream breakers/rectifier." }
  }
};

export async function POST() {
  // Guard: do not seed in production
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Seeding disabled in production" }, { status: 403 });
  }
  if (!RULEPACKS_ID) {
    return NextResponse.json({ ok: false, error: "TB_RULEPACKS missing" }, { status: 500 });
  }

  try {
    const packsTbl = table(RULEPACKS_ID);
    // Upsert by Key (case-insensitive)
    const found = await packsTbl.select({
      filterByFormula: `LOWER({Key})=LOWER("${SAMPLE.key}")`,
      maxRecords: 1
    }).firstPage();

    // Link EquipmentType "TopDrive" if available (optional)
    let equipTypeLink: string[] | undefined = undefined;
    try {
      if (EQUIPTYPES_ID) {
        const etTbl = table(EQUIPTYPES_ID);
        const et = await etTbl.select({
          filterByFormula: `LOWER({Name})="topdrive"`,
          maxRecords: 1
        }).firstPage();
        if (et && et[0]) equipTypeLink = [et[0].id];
      }
    } catch {}

    const fields: any = {
      Key: SAMPLE.key,
      Active: true,
      Json: JSON.stringify(SAMPLE, null, 2),
    };
    // Only set the link if the column exists in your base:
    // Try EquipmentType first, then EquipmentTypeLink (whichever exists).
    try { fields["EquipmentType"] = equipTypeLink; } catch {}
    try { fields["EquipmentTypeLink"] = equipTypeLink; } catch {}

    if (found && found[0]) {
      const updated = await packsTbl.update(found[0].id, fields);
      return NextResponse.json({ ok: true, action: "updated", id: updated.id, key: SAMPLE.key });
    } else {
      const created = await packsTbl.create([{ fields }]);
      const rec = created && created[0] ? normalize(created[0]) : null;
      return NextResponse.json({ ok: true, action: "created", id: rec?.id, key: SAMPLE.key });
    }
  } catch (err:any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
