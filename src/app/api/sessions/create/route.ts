import { NextResponse } from "next/server";
import { airtableCreate } from "@/lib/airtable-rest";

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

const TB_EQUIP = process.env.TB_EQUIPMENT_INSTANCES || "EquipmentInstances";
const TB_SESSIONS = process.env.TB_SESSIONS || "Sessions";

// Order matters: put your most-likely field names first
const EQUIP_LINK_CANDIDATES = [
  "RigEquipment",
  "Equipment",
  "EquipmentInstance",
  "EquipmentInstances",
  "Rig",
];

const NAME_FIELDS = ["Name", "Title", "Equipment Name"];
const SERIAL_FIELDS = ["Serial", "SerialNumber", "SN"];
const DATE_FIELDS = ["CreatedAt", "Created", "Date", "Timestamp"];
const PROBLEM_FIELDS = ["Problem", "Issue", "Notes", "Summary"];

function firstOf(cands: string[], fallback: string) {
  return (allow?: Set<string>) => {
    if (allow) for (const k of cands) if (allow.has(k)) return k;
    // without schema, just use first as best-guess
    return cands[0] || fallback;
  };
}
const pickName = firstOf(NAME_FIELDS, "Name");
const pickSerial = firstOf(SERIAL_FIELDS, "Serial");
const pickDate = firstOf(DATE_FIELDS, "CreatedAt");
const pickProblem = firstOf(PROBLEM_FIELDS, "Problem");

function isUnknownFieldError(e: any) {
  const msg = typeof e?.message === "string" ? e.message : String(e);
  return msg.includes("UNKNOWN_FIELD_NAME") || msg.includes("Unknown field name");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.problem || body.problem.trim().length < 3) {
      return NextResponse.json({ ok: false, error: "problem (min 3 chars) required" }, { status: 400 });
    }

    // 1) Resolve equipment id (use provided or create)
    let equipmentId = body.equipmentId;
    if (!equipmentId) {
      if (!body.newEquipment?.name || body.newEquipment.name.trim().length < 3) {
        return NextResponse.json({ ok: false, error: "newEquipment.name (min 3 chars) required" }, { status: 400 });
      }
      const ef: Record<string, any> = {};
      ef[pickName()] = body.newEquipment.name.trim();
      if (body.newEquipment.serial) ef[pickSerial()] = body.newEquipment.serial;
      // Optional details
      ef[pickDate()] = new Date().toISOString();

      const createdEquip = await airtableCreate(TB_EQUIP, ef);
      equipmentId = createdEquip.id;
    }

    // 2) Try to create session with equipment link using candidates
    const baseFields = {
      [pickProblem()]: body.problem.trim(),
      [pickDate()]: new Date().toISOString(),
    };

    let lastErr: any = null;
    for (const linkKey of EQUIP_LINK_CANDIDATES) {
      const fields = { ...baseFields, [linkKey]: [equipmentId] };
      try {
        const session = await airtableCreate(TB_SESSIONS, fields);
        const res = NextResponse.json({ ok: true, sessionId: session.id, equipmentId, linked: true, linkKey });
        res.headers.set("x-rt-route", "/api/sessions/create");
        return res;
      } catch (e: any) {
        lastErr = e;
        if (!isUnknownFieldError(e)) {
          // Different error -> bubble it up immediately
          throw e;
        }
        // else try next candidate
      }
    }

    // 3) If all candidates failed due to unknown field, create the session without the link
    const minimal = await airtableCreate(TB_SESSIONS, baseFields);
    return NextResponse.json({
      ok: true,
      sessionId: minimal.id,
      equipmentId,
      linked: false,
      hint: "No equipment link field found on Sessions table. Please add a link-to-EquipmentInstances field.",
      tried: EQUIP_LINK_CANDIDATES,
      lastError: String(lastErr?.message || lastErr),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}