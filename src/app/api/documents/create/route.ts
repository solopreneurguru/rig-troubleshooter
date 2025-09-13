// src/app/api/documents/create/route.ts
import { NextResponse } from "next/server";

/**
 * Minimal, schema-tolerant Documents create:
 * - Uses Airtable REST only (no SDK) to avoid "o.fields is not a function"
 * - Tries common field name variants; falls back between them automatically
 */

type Json = Record<string, any>;

function j(x: unknown): Json {
  return x && typeof x === "object" ? (x as Json) : {};
}

function validRecId(id: unknown): id is string {
  return typeof id === "string" && id.startsWith("rec") && id.length >= 10;
}

async function postAirtable(
  baseId: string,
  tableName: string,
  apiKey: string,
  fields: Record<string, any>
) {
  const res = await fetch(
    `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(
      tableName
    )}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }] }),
    }
  );

  const text = await res.text();
  let json: Json = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* keep raw text in json.raw when non-JSON */
    json = { raw: text };
  }

  return { ok: res.ok, status: res.status, json, text };
}

export async function POST(req: Request) {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TB_DOCS = process.env.TB_DOCS || "Documents";
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { ok: false, error: "Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID" },
        { status: 500 }
      );
    }

    const body = j(await req.json().catch(() => ({})));
    // Accept multiple client keys but normalize:
    const equipmentId =
      body.equipmentId || body.rigEquipmentId || body.rigId || body.equipId;

    const title = body.title ?? body.name ?? "";
    const url = body.url ?? body.fileUrl ?? body.blobUrl ?? body.link ?? "";
    const docType = body.type ?? body.docType ?? "Other";

    if (!validRecId(equipmentId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "rigEquipmentId required",
          hint: "Pass an EquipmentInstances record id (starts with 'rec').",
          got: equipmentId,
        },
        { status: 400 }
      );
    }
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { ok: false, error: "title required" },
        { status: 400 }
      );
    }
    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        { ok: false, error: "file URL required (url)" },
        { status: 400 }
      );
    }

    // We'll try a few common field name variants until one works.
    const linkKeys = ["Rig", "RigEquipment", "Equipment", "EquipmentInstance", "EquipmentInstances"];
    const urlKeys = ["BlobURL", "URL", "Url", "Link"];
    const titleKeys = ["Title", "Name", "Document Title", "Doc Title"];
    const typeKeys = ["DocType", "Type", "DocumentType", "Document Type"];

    const attempts: Array<{ fields: Record<string, any>; status?: number; err?: Json }> = [];

    for (const linkKey of linkKeys) {
      for (const urlKey of urlKeys) {
        const fields: Record<string, any> = {};

        // choose first plausible keys for title/type
        fields[titleKeys[0]] = title; // Title
        fields[typeKeys[0]] = docType; // DocType

        // link + url candidates for this attempt
        fields[linkKey] = [equipmentId];
        fields[urlKey] = url;

        const r = await postAirtable(AIRTABLE_BASE_ID, TB_DOCS, AIRTABLE_API_KEY, fields);
        if (r.ok && r.json?.records?.[0]?.id) {
          return NextResponse.json({ ok: true, id: r.json.records[0].id, used: { linkKey, urlKey } });
        }
        attempts.push({ fields, status: r.status, err: r.json?.error ?? r.json });
        // If it's "UNKNOWN_FIELD_NAME", try next variant; otherwise keep looping.
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Could not create document in Airtable (schema mismatch?)",
        attempts, // includes the last few Airtable error bodies so we can see which field name failed
      },
      { status: 422 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}