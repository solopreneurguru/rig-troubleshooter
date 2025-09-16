import { NextResponse } from "next/server";
import { airtableCreate } from "@/lib/airtable-rest";
import { getAirtableEnv } from "@/lib/env";

export const runtime = "nodejs";

type Body = {
  equipmentId?: string;
  newEquipment?: {
    name: string;
    serial?: string;
    typeId?: string;
    note?: string;
  };
  problem: string;
};

// Try these link-field names (order matters; put your most-likely first)
const EQUIP_LINK_CANDIDATES = [
  "RigEquipment",
  "Equipment",
  "EquipmentInstance",
  "EquipmentInstances",
  "Rig",
];

// fields we are OK to write for equipment/session
// (intentionally NO CreatedAt/Created time or any computed fields)
const NAME_FIELDS = ["Name", "Title", "Equipment Name"];
const SERIAL_FIELDS = ["Serial", "SerialNumber", "SN"];
const PROBLEM_FIELDS = ["Problem", "Issue", "Notes", "Summary"];

function firstOf(cands: string[], fallback: string) {
  return (allow?: Set<string>) => {
    if (allow) {
      for (const k of cands) if (allow.has(k)) return k;
    }
    return cands[0] || fallback;
  };
}
const pickName = firstOf(NAME_FIELDS, "Name");
const pickSerial = firstOf(SERIAL_FIELDS, "Serial");
const pickProblem = firstOf(PROBLEM_FIELDS, "Problem");

function isUnknownFieldError(e: any) {
  const msg = typeof e?.message === "string" ? e.message : String(e);
  return msg.includes("UNKNOWN_FIELD_NAME") || msg.includes("Unknown field name");
}

export async function POST(req: Request) {
  console.log("api_start", { route: "sessions/create", time: new Date().toISOString() });

  try {
    const body = (await req.json()) as Body;
    const { key, baseId, tables } = getAirtableEnv();

    // Basic validation
    if (!body?.problem || body.problem.trim().length < 3) {
      return NextResponse.json({ ok: false, error: "problem (min 3 chars) required" }, { status: 400 });
    }

    // 1) Resolve equipment id: use provided, else create new (REST)
    let equipmentId = body.equipmentId;
    if (!equipmentId) {
      if (!body.newEquipment?.name || body.newEquipment.name.trim().length < 3) {
        return NextResponse.json({ ok: false, error: "newEquipment.name (min 3 chars) required" }, { status: 400 });
      }
      const ef: Record<string, any> = {};
      ef[pickName()] = body.newEquipment.name.trim();
      if (body.newEquipment.serial) ef[pickSerial()] = body.newEquipment.serial;

      // IMPORTANT: DO NOT send CreatedAt or any computed/auto fields.
      const createdEquip = await airtableCreate(tables.equipment, ef);
      equipmentId = createdEquip.id;
    }

    // 2) Try to create session and link equipment using candidate link-field names
    const baseFields: Record<string, any> = {
      [pickProblem()]: body.problem.trim(),
      // No CreatedAt here either; Airtable will set created time itself
    };

    let lastErr: any = null;
    for (const linkKey of EQUIP_LINK_CANDIDATES) {
      try {
        const fields = { ...baseFields, [linkKey]: [equipmentId] };
        const session = await airtableCreate(tables.sessions, fields);
        const res = NextResponse.json({
          ok: true,
          sessionId: session.id,
          equipmentId,
          linked: true,
          linkKey,
        });
        res.headers.set("x-rt-route", "/api/sessions/create");
        return res;
      } catch (e: any) {
        lastErr = e;
        if (!isUnknownFieldError(e)) throw e; // only ignore unknown-field; anything else bubble up
      }
    }

    // 3) If no candidate link field exists, create session without link and return a hint
    const minimal = await airtableCreate(tables.sessions, baseFields);
    return NextResponse.json({
      ok: true,
      sessionId: minimal.id,
      equipmentId,
      linked: false,
      hint:
        "No equipment link field found on Sessions table. Add a link-to-EquipmentInstances field (e.g., RigEquipment/Equipment).",
      tried: EQUIP_LINK_CANDIDATES,
      lastError: String(lastErr?.message || lastErr),
    });
  } catch (err: any) {
    console.error("api_error", { 
      route: "sessions/create", 
      err: String(err), 
      stack: err?.stack 
    });
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}