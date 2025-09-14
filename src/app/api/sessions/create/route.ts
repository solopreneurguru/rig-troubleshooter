import { NextResponse } from "next/server";
import { airtableCreate } from "@/lib/airtable-rest";

type Body = {
  // If present, we will use it; otherwise we will create new equipment first
  equipmentId?: string;

  // Provided when creating new equipment
  newEquipment?: {
    name: string;
    serial?: string;
    typeId?: string; // link to EquipmentTypes if available
    note?: string;   // free-form notes / PLC link
  };

  // Required for the session
  problem: string;
};

const TB_EQUIP = process.env.TB_EQUIPMENT_INSTANCES || "EquipmentInstances";
const TB_EQUIP_TYPES = process.env.TB_EQUIPMENT_TYPES || "EquipmentTypes";
const TB_SESSIONS = process.env.TB_SESSIONS || "Sessions";

// Flexible field candidates so we don't break on Airtable schema tweaks
const NAME_FIELDS = ["Name", "Title", "Equipment Name"];
const SERIAL_FIELDS = ["Serial", "SerialNumber", "SN"];
const EQUIPTYPE_LINK_FIELDS = ["EquipmentTypes", "EquipmentType", "Type"];
const EQUIP_LINK_FIELDS = ["RigEquipment", "Equipment", "EquipmentInstance", "EquipmentInstances"];
const PROBLEM_FIELDS = ["Problem", "Issue", "Notes", "Summary"];
const DATE_FIELDS = ["CreatedAt", "Created", "Date", "Timestamp"];

function pick(firsts: string[], allow: Set<string>, fallback?: string) {
  for (const k of firsts) if (allow.has(k)) return k;
  return fallback || firsts[0];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
    }
    if (!body.equipmentId && !body.newEquipment?.name) {
      return NextResponse.json({ ok: false, error: "equipmentId or newEquipment.name required" }, { status: 400 });
    }
    if (!body.problem || body.problem.trim().length < 3) {
      return NextResponse.json({ ok: false, error: "problem (min 3 chars) required" }, { status: 400 });
    }

    // We cannot introspect fields cheaply without metadata permissions,
    // so we build fields with broad candidates and let Airtable ignore unknowns.

    // --- 1) Resolve equipment id (existing or create new)
    let equipmentId = body.equipmentId;

    if (!equipmentId) {
      const allowEquip = new Set<string>([
        ...NAME_FIELDS, ...SERIAL_FIELDS, ...EQUIPTYPE_LINK_FIELDS, ...DATE_FIELDS, "Notes", "PLCLink", "PLC Project Doc Link"
      ]);

      const ef: Record<string, any> = {};
      // Name
      const nameKey = pick(NAME_FIELDS, allowEquip, "Name");
      ef[nameKey] = body.newEquipment!.name;

      // Serial
      if (body.newEquipment!.serial) {
        const snKey = pick(SERIAL_FIELDS, allowEquip, "Serial");
        ef[snKey] = body.newEquipment!.serial;
      }

      // Optional type link
      if (body.newEquipment!.typeId) {
        const typeKey = pick(EQUIPTYPE_LINK_FIELDS, allowEquip, "EquipmentTypes");
        ef[typeKey] = [body.newEquipment!.typeId];
      }

      // Optional note / PLC link
      if (body.newEquipment!.note) {
        const noteKey = allowEquip.has("Notes") ? "Notes" : (allowEquip.has("PLCLink") ? "PLCLink" : "Description");
        ef[noteKey] = body.newEquipment!.note;
      }

      // Optional created timestamp
      const dtKey = pick(DATE_FIELDS, allowEquip, "CreatedAt");
      ef[dtKey] = new Date().toISOString();

      const created = await airtableCreate(TB_EQUIP, ef);
      equipmentId = created.id;
    }

    // --- 2) Create session
    const allowSess = new Set<string>([
      ...EQUIP_LINK_FIELDS, ...PROBLEM_FIELDS, ...DATE_FIELDS, "Status"
    ]);
    const sf: Record<string, any> = {};

    const linkKey = pick(EQUIP_LINK_FIELDS, allowSess, "RigEquipment");
    sf[linkKey] = [equipmentId];

    const probKey = pick(PROBLEM_FIELDS, allowSess, "Problem");
    sf[probKey] = body.problem.trim();

    const dateKey = pick(DATE_FIELDS, allowSess, "CreatedAt");
    sf[dateKey] = new Date().toISOString();

    // optional status default
    if (allowSess.has("Status")) sf["Status"] = "Open";

    const session = await airtableCreate(TB_SESSIONS, sf);

    const res = NextResponse.json({
      ok: true,
      sessionId: session.id,
      equipmentId,
      redirect: `/sessions/${session.id}`,
    });
    res.headers.set("x-rt-route", "/api/sessions/create");
    return res;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}