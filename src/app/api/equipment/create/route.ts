// src/app/api/equipment/create/route.ts
import { NextResponse } from "next/server";
import Airtable from "airtable";
import { getTableFields } from "@/lib/airtable-metadata";

const TB_EQUIPMENT =
  process.env.TB_EQUIPMENT_INSTANCES ||
  process.env.TB_RIG_EQUIP ||
  "EquipmentInstances";

const TB_EQUIP_TYPES =
  process.env.TB_EQUIPMENT_TYPES ||
  "EquipmentTypes";

function getAirtableBase() {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  if (!API_KEY || !BASE_ID) {
    throw new Error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
  }
  Airtable.configure({ apiKey: API_KEY });
  return { base: new Airtable().base(BASE_ID), API_KEY, BASE_ID };
}

function validRecId(v?: string | null) {
  return !!v && typeof v === "string" && v.startsWith("rec");
}

export async function POST(req: Request) {
  try {
    const { base, API_KEY, BASE_ID } = getAirtableBase();

    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      serial?: string;
      typeId?: string; // optional: record id from EquipmentTypes
      note?: string;   // optional misc
    };

    // Discover fields available on EquipmentInstances
    const allow = new Set(await getTableFields(base, TB_EQUIPMENT));

    // Common candidates seen across Airtable bases
    const NAME_FIELDS = ["Name", "Title", "Equipment Name", "Label"];
    const SERIAL_FIELDS = ["SerialNumber", "Serial", "S/N", "Serial No"];
    const TYPE_LINK_FIELDS = [
      "Type",
      "EquipmentType",
      "Equipment Types",
      "EquipType",
      "TypeRef",
    ];
    const NOTE_FIELDS = ["Notes", "Note", "Description", "Details"];

    const firstExisting = (cands: string[]) => cands.find((f) => allow.has(f));

    const nameKey = firstExisting(NAME_FIELDS);
    if (!nameKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "No name field available on equipment table",
          debug: { table: TB_EQUIPMENT, allow: [...allow], tried: NAME_FIELDS },
        },
        { status: 500 }
      );
    }

    const serialKey = firstExisting(SERIAL_FIELDS);
    const typeKey = firstExisting(TYPE_LINK_FIELDS);
    const noteKey  = firstExisting(NOTE_FIELDS);

    const name = (body?.name || "").trim();
    if (name.length < 1) {
      return NextResponse.json(
        { ok: false, error: "name is required" },
        { status: 400 }
      );
    }

    const fields: Record<string, any> = {};
    fields[nameKey] = name;
    if (serialKey && body?.serial) fields[serialKey] = String(body.serial).trim();
    if (noteKey && body?.note) fields[noteKey] = String(body.note).trim();

    if (typeKey && body?.typeId && validRecId(body.typeId)) {
      fields[typeKey] = [{ id: body.typeId }];
    }

    // Use Airtable REST to avoid SDK shape issues
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TB_EQUIPMENT)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }] }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: "Airtable create failed",
          status: res.status,
          body: text,
          debug: { table: TB_EQUIPMENT, fields },
        },
        { status: 502 }
      );
    }

    const json = (await res.json().catch(() => ({}))) as any;
    const id = json?.records?.[0]?.id;
    if (!validRecId(id)) {
      return NextResponse.json(
        { ok: false, error: "Create succeeded but no record id returned", debug: json },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to create equipment" },
      { status: 500 }
    );
  }
}
