// src/app/api/equipment/create/route.ts
import { NextResponse } from "next/server";
import Airtable from "airtable";
import { getTableFields } from "@/lib/airtable-metadata";

// Resolve table names from envs with sensible fallbacks
const TB_EQUIPMENT =
  process.env.TB_EQUIPMENT_INSTANCES ||
  process.env.TB_RIG_EQUIP ||
  "EquipmentInstances";

function initAirtable() {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  if (!API_KEY || !BASE_ID) {
    throw new Error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
  }
  Airtable.configure({ apiKey: API_KEY });
  return { base: new Airtable().base(BASE_ID), API_KEY, BASE_ID };
}

const validRecId = (v?: unknown) =>
  typeof v === "string" && v.startsWith("rec");

export async function POST(req: Request) {
  try {
    const { base, API_KEY, BASE_ID } = initAirtable();
    const input = (await req.json().catch(() => ({}))) as {
      name?: string;
      serial?: string;
      typeId?: string; // optional linked EquipmentTypes rec id
      note?: string;   // optional
    };

    // Discover allowed fields dynamically
    const allow = new Set(await getTableFields(base, TB_EQUIPMENT));

    const NAME_FIELDS = ["Name", "Title", "Equipment Name", "Label"];
    const SERIAL_FIELDS = ["SerialNumber", "Serial", "S/N", "Serial No"];
    const TYPE_LINK_FIELDS = ["Type", "EquipmentType", "Equipment Types", "EquipType"];
    const NOTE_FIELDS = ["Notes", "Note", "Description", "Details"];

    const pick = (cands: string[]) => cands.find((f) => allow.has(f));

    const nameKey = pick(NAME_FIELDS);
    if (!nameKey) {
      return NextResponse.json(
        { ok: false, error: "No name-like field on EquipmentInstances", debug: [...allow] },
        { status: 500 }
      );
    }

    const name = String(input?.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    }

    const serialKey = pick(SERIAL_FIELDS);
    const typeKey = pick(TYPE_LINK_FIELDS);
    const noteKey = pick(NOTE_FIELDS);

    const fields: Record<string, any> = { [nameKey]: name };
    if (serialKey && input?.serial) fields[serialKey] = String(input.serial).trim();
    if (noteKey && input?.note) fields[noteKey] = String(input.note).trim();
    if (typeKey && validRecId(input?.typeId)) fields[typeKey] = [{ id: input!.typeId }];

    // Use Airtable REST — always correct payload shape: { records: [{ fields }] }
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
        { ok: false, error: "Airtable create failed", status: res.status, body: text, fields },
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
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to create equipment" },
      { status: 500 }
    );
  }
}