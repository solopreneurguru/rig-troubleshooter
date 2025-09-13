import { NextResponse } from "next/server";
import { withDeadline } from "@/lib/withDeadline";
import { getTableFields } from "@/lib/airtable-metadata"; // we can still use metadata helper
import { getBase } from "@/lib/airtable"; // only to resolve base envs (no SDK create)

type FieldMap = Record<string, any>;
const toPojo = (o: any): FieldMap =>
  o && typeof o === "object" && !Array.isArray(o) ? { ...o } : {};

const NAME_FIELDS = ["Title", "Name", "Document Title", "Doc Title"];
const TYPE_FIELDS = ["Type", "DocumentType", "Document Type", "DocType"];
const URL_FIELDS  = ["Url", "URL", "BlobUrl", "Blob URL", "FileUrl", "File URL", "Link"];
const ATTACHMENT_FIELDS = ["Attachments", "Files"];
const LINK_FIELDS = [
  "RigEquipment",
  "Equipment",
  "EquipmentInstance",
  "EquipmentInstances",
  "Rig Equipment",
];

const validRecId = (v: any) => typeof v === "string" && v.startsWith("rec") && v.length > 3;

function firstExisting(allow: Set<string>, candidates: string[]) {
  return candidates.find((f) => allow.has(f));
}

export async function POST(req: Request) {
  try {
    // Env
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
    const TB_DOCS =
      process.env.TB_DOCS?.trim() ||
      "Documents";

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { ok: false, error: "Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID" },
        { status: 500 }
      );
    }

    // Parse body
    const body = await req.json().catch(() => ({} as any));
    const title = (body?.title ?? "").toString().trim();
    const docType = (body?.type ?? "").toString().trim();
    const url = (body?.url ?? "").toString().trim();

    // Accept a variety of keys for the equipment link (frontend always sends rigEquipmentId now)
    const rawId: string | null =
      (body?.rigEquipmentId as string) ||
      (body?.equipmentId as string) ||
      (body?.equipId as string) ||
      (body?.rigEquipId as string) ||
      (body?.rig_equipment_id as string) ||
      null;

    if (!validRecId(rawId)) {
      return NextResponse.json(
        { ok: false, error: "rigEquipmentId missing/invalid" },
        { status: 400 }
      );
    }
    const rigEquipmentId = rawId!.trim();

    // Find which fields exist on the Documents table
    const allow = await getTableFields(TB_DOCS);
    const allowSet = new Set(allow);

    const nameKey = firstExisting(allowSet, NAME_FIELDS);
    const typeKey = firstExisting(allowSet, TYPE_FIELDS);
    const linkKey = firstExisting(allowSet, LINK_FIELDS);
    const urlKey  = firstExisting(allowSet, URL_FIELDS);
    const attachKey = firstExisting(allowSet, ATTACHMENT_FIELDS);

    if (!linkKey) {
      return NextResponse.json(
        { ok: false, error: "No link field present on Documents", debug: { LINK_FIELDS, allow } },
        { status: 500 }
      );
    }

    // Build fields object (only keys that actually exist)
    const fields: FieldMap = {};
    if (nameKey && title) fields[nameKey] = title;
    if (typeKey && docType) fields[typeKey] = docType;
    fields[linkKey] = [rigEquipmentId];

    // Prefer URL field; otherwise fall back to attachments
    if (url && urlKey) {
      fields[urlKey] = url;
    } else if (url && attachKey) {
      fields[attachKey] = [{ url, filename: title || "document" }];
    } else if (!url && !urlKey && !attachKey) {
      // Nothing to store the file URL; abort with helpful message
      return NextResponse.json(
        {
          ok: false,
          error: "No URL/Attachment field exists on Documents table",
          debug: { URL_FIELDS, ATTACHMENT_FIELDS, allow },
        },
        { status: 500 }
      );
    }

    // Create via Airtable REST (avoid SDK create() which caused the 'o.fields' error)
    const tableName = encodeURIComponent(TB_DOCS);
    const createUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}`;

    const res = await withDeadline(
      fetch(createUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records: [{ fields }] }),
      }),
      10000,
      "docs-create-rest"
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: "Airtable REST create failed", status: res.status, body: text },
        { status: 502 }
      );
    }

    const json = await res.json().catch(() => ({} as any));
    const recId =
      json?.records?.[0]?.id && validRecId(json.records[0].id) ? json.records[0].id : null;

    if (!recId) {
      return NextResponse.json(
        { ok: false, error: "Create succeeded but no record id returned", debug: json },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: recId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error", stack: e?.stack },
      { status: 500 }
    );
  }
}