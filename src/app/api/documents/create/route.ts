// src/app/api/documents/create/route.ts
import { NextResponse } from "next/server";

type Json = Record<string, any>;

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";
const TB_DOCS = process.env.TB_DOCS || "Documents";

function validRecId(id: unknown): id is string {
  return typeof id === "string" && id.startsWith("rec");
}

const AT_URL = AIRTABLE_BASE_ID
  ? `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TB_DOCS)}`
  : "";

const URL_FIELDS = [
  "Url", "URL", "BlobUrl", "BlobURL", "Blob URL",
  "FileUrl", "File URL", "Link"
];

const LINK_FIELDS = [
  "Rig", "RigEquipment", "Equipment", "EquipmentInstance",
  "EquipmentInstances", "Rig Equipment"
];

const NAME_FIELDS = ["Title", "Name", "Document Title", "Doc Title"];
const TYPE_FIELDS = ["Type", "DocumentType", "Document Type", "DocType"];
const ATTACHMENT_FIELDS = ["Attachments", "Files"];

function normKey(s: string) {
  return s.toLowerCase().replace(/[\s_]/g, "");
}

function findFirstExisting(allow: Set<string>, candidates: string[]) {
  // Build a lookup of normalized actual field names -> real names
  const map = new Map<string, string>();
  for (const k of allow) map.set(normKey(k), k);

  for (const want of candidates) {
    const hit = map.get(normKey(want));
    if (hit) return hit;
  }
  return undefined;
}

async function tryCreate(fields: Json) {
  const res = await fetch(AT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ records: [{ fields }] }),
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json, text };
}

export async function POST(req: Request) {
  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { ok: false, error: "Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID" },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Json;

    // Accept multiple key names from the client for flexibility
    const title =
      (body.title ?? body.name ?? body.documentTitle ?? "").toString().trim();
    const docType =
      (body.type ?? body.documentType ?? body.docType ?? "").toString().trim();
    const url = (body.url ?? body.fileUrl ?? "").toString().trim();

    const equipmentId = [body.equipmentId, body.rigEquipmentId, body.equipment]
      .find(validRecId);

    if (!title) {
      return NextResponse.json({ ok: false, error: "title required" }, { status: 400 });
    }
    if (!equipmentId) {
      return NextResponse.json(
        { ok: false, error: "equipmentId (rec...) required" },
        { status: 400 }
      );
    }
    if (!url) {
      return NextResponse.json(
        { ok: false, error: "file url missing" },
        { status: 400 }
      );
    }

    // We don't depend on table schema now — we try common field names until one works.
    const linkCandidates = LINK_FIELDS;
    const urlCandidates = URL_FIELDS;
    const attachCandidates = ATTACHMENT_FIELDS;

    const attempts: Json[] = [];

    for (const linkKey of linkCandidates) {
      // First: URL style fields
      for (const urlKey of urlCandidates) {
        attempts.push({
          Title: title,         // harmless if field doesn't exist
          Name: title,          // harmless if field doesn't exist
          DocType: docType,     // harmless if field doesn't exist
          Type: docType,        // harmless if field doesn't exist
          [linkKey]: [{ id: equipmentId }],
          [urlKey]: url,
        });
      }
      // Second: Attachment style fields
      for (const aKey of attachCandidates) {
        attempts.push({
          Title: title,
          Name: title,
          DocType: docType,
          Type: docType,
          [linkKey]: [{ id: equipmentId }],
          [aKey]: [{ url, filename: title }],
        });
      }
    }

    let last: any = null;
    for (const fields of attempts) {
      const { ok, json, status } = await tryCreate(fields);
      last = { status, json, fields };
      const recId = json?.records?.[0]?.id;
      if (ok && validRecId(recId)) {
        return NextResponse.json({ ok: true, id: recId });
      }

      // If it's an "Unknown field name" error, keep trying other field combos.
      const msg = (json?.error?.message ?? "").toString();
      if (!/Unknown field name/i.test(msg)) {
        // Stop on non-schema errors (e.g., permission, base/table mismatch)
        break;
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Could not create document in Airtable (schema mismatch?)",
        debug: last,
      },
      { status: 502 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "unexpected error" },
      { status: 500 }
    );
  }
}