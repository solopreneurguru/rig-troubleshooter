/* Changes:
   - Accept { autoClassify, sessionId, rigEquipmentId }.
   - If autoClassify and no type provided, classify via util.
   - Set Title if missing (from filename), set MimeType/SizeBytes if fields exist.
   - Preserve schema-agnostic field mapping via getTableFields + setIfExists.
*/

import { NextResponse } from "next/server";
import { withDeadline } from "@/lib/withDeadline";
import Airtable from "airtable";
import { getTableFields } from "@/lib/airtable-metadata";
import { classifyByMimeAndName, pickDocTypeKey, cleanTitleFromFilename } from "@/lib/classifyDoc";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TB_DOCS = process.env.TB_DOCS || "Documents";

function getAirtableBase() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) throw new Error("Airtable env missing");
  Airtable.configure({ apiKey: AIRTABLE_API_KEY });
  return new Airtable().base(AIRTABLE_BASE_ID);
}

export async function POST(req: Request) {
  try {
    const base = getAirtableBase();
    const docs = base.table(TB_DOCS);

    const body = await req.json().catch(() => ({}));
    const {
      title,
      type,
      url,
      filename,
      mime,
      size,
      notes,
      sessionId,
      rigEquipmentId,
      autoClassify,
    } = body || {};

    if (!url) return NextResponse.json({ ok: false, error: "url required" }, { status: 400 });
    if (!rigEquipmentId) {
      return NextResponse.json({ ok: false, error: "rigEquipmentId required" }, { status: 400 });
    }

    const allow = await getTableFields(base, TB_DOCS);
    const fields: Record<string, any> = {};

    // Title
    const titleKey =
      ["Title", "Name", "Document Title"].find((k) => allow.has(k)) || "Title";
    fields[titleKey] = title || cleanTitleFromFilename(filename);

    // DocType (type) – use provided or classify
    let docType = type;
    if (!docType && autoClassify) {
      docType = classifyByMimeAndName({ mime, filename }).type;
    }
    const typeKey = pickDocTypeKey(allow);
    if (typeKey && docType) fields[typeKey] = docType;

    // URL or Attachment
    const urlKey = ["Url", "URL", "BlobUrl", "Blob URL", "FileUrl", "File URL", "Link"].find((k) =>
      allow.has(k)
    );
    const attachKey = ["Attachments", "Files"].find((k) => allow.has(k));
    if (urlKey) {
      fields[urlKey] = url;
    } else if (attachKey) {
      fields[attachKey] = [{ url, filename: filename || fields[titleKey] || "document" }];
    } else {
      return NextResponse.json(
        { ok: false, error: "No URL/Attachment field exists on Documents table" },
        { status: 500 }
      );
    }

    // Optional: MimeType / SizeBytes / Notes / SessionId / Equipment link
    const mimeKey = ["MimeType", "MIME", "ContentType"].find((k) => allow.has(k));
    if (mimeKey && mime) fields[mimeKey] = mime;

    const sizeKey = ["SizeBytes", "Size", "FileSize"].find((k) => allow.has(k));
    if (sizeKey && typeof size === "number") fields[sizeKey] = size;

    const notesKey = ["Notes", "Summary", "Description"].find((k) => allow.has(k));
    if (notesKey && notes) fields[notesKey] = notes;

    const sessionKey = ["SessionId", "SessionID", "Session"].find((k) => allow.has(k));
    if (sessionKey && sessionId) fields[sessionKey] = String(sessionId);

    const linkKey =
      ["RigEquipment", "Equipment", "EquipmentInstance", "EquipmentInstances", "Rig Equipment"].find(
        (k) => allow.has(k)
      );
    if (!linkKey) {
      return NextResponse.json(
        { ok: false, error: "No equipment link field found in Documents table" },
        { status: 500 }
      );
    }
    fields[linkKey] = [rigEquipmentId];

    // Create via Airtable REST (more stable than SDK create in this app)
    const createUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
      TB_DOCS
    )}`;
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

    const json = (await res.json()) as any;
    const recId = json?.records?.[0]?.id;
    return NextResponse.json({
      ok: true,
      id: recId,
      title: fields[titleKey],
      type: fields[typeKey || "DocType"] || undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "create failed" }, { status: 500 });
  }
}