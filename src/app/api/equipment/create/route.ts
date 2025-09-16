import { NextResponse } from "next/server";
import Airtable from "airtable";
import { getTableFields } from "@/lib/airtable-metadata";
import { getAirtableEnv } from "@/lib/env";

export const runtime = "nodejs";

const validRecId = (v?: unknown) =>
  typeof v === "string" && v.startsWith("rec");

export async function POST(req: Request) {
  console.log("api_start", { route: "equipment/create", time: new Date().toISOString() });

  // Debug: tag this route so we can see it in Network response headers
  const routeName = "/api/equipment/create";
  const ok = (data: any, status = 200) =>
    new NextResponse(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json", "x-rt-route": routeName },
    });

  try {
    const A = getAirtableEnv();
    const base = new Airtable({ apiKey: A.key }).base(A.baseId);
    
    const input = (await req.json().catch(() => ({}))) as {
      name?: string;
      serial?: string;
      typeId?: string; // optional linked EquipmentTypes rec id
      note?: string;   // optional
    };

    // Discover allowed fields dynamically
    const allow = new Set(await getTableFields(base, A.tables.equipment));

    const NAME_FIELDS = ["Name", "Title", "Equipment Name", "Label"];
    const SERIAL_FIELDS = ["SerialNumber", "Serial", "S/N", "Serial No"];
    const TYPE_LINK_FIELDS = ["Type", "EquipmentType", "Equipment Types", "EquipType"];
    const NOTE_FIELDS = ["Notes", "Note", "Description", "Details"];

    const pick = (cands: string[]) => cands.find((f) => allow.has(f));

    const nameKey = pick(NAME_FIELDS);
    if (!nameKey) {
      return ok(
        { ok: false, error: "No name-like field on EquipmentInstances", debug: [...allow] },
        500
      );
    }

    const name = String(input?.name ?? "").trim();
    if (!name) {
      return ok({ ok: false, error: "name is required" }, 400);
    }

    const serialKey = pick(SERIAL_FIELDS);
    const typeKey = pick(TYPE_LINK_FIELDS);
    const noteKey = pick(NOTE_FIELDS);

    const fields: Record<string, any> = { [nameKey]: name };
    if (serialKey && input?.serial) fields[serialKey] = String(input.serial).trim();
    if (noteKey && input?.note) fields[noteKey] = String(input.note).trim();
    if (typeKey && validRecId(input?.typeId)) fields[typeKey] = [{ id: input!.typeId }];

    // Use Airtable REST — always correct payload shape: { records: [{ fields }] }
    const url = `https://api.airtable.com/v0/${A.baseId}/${encodeURIComponent(A.tables.equipment)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${A.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }] }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return ok(
        { ok: false, error: "Airtable create failed", status: res.status, body: text, fields },
        502
      );
    }

    const json = (await res.json().catch(() => ({}))) as any;
    const id = json?.records?.[0]?.id;
    if (!validRecId(id)) {
      return ok(
        { ok: false, error: "Create succeeded but no record id returned", debug: json },
        500
      );
    }

    return ok({ ok: true, id });
  } catch (err: any) {
    console.error("api_error", { 
      route: "equipment/create", 
      err: String(err), 
      stack: err?.stack 
    });
    return new NextResponse(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "x-rt-route": routeName },
    });
  }
}