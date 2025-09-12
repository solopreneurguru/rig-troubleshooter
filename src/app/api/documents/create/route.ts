import { NextResponse } from "next/server";
import { withDeadline } from "@/lib/withDeadline";
import { getTableFields, setIfExists } from "@/lib/airtable-metadata";
import Airtable from "airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

function getBase() {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  if (!API_KEY || !BASE_ID) throw new Error("Airtable env missing");
  
  Airtable.configure({ apiKey: API_KEY });
  return new Airtable().base(BASE_ID);
}

// Common field name patterns
const NAME_FIELDS = ["Title", "Name", "Document Title", "Doc Title"];
const TYPE_FIELDS = ["Type", "DocumentType", "Document Type", "DocType"];
const URL_FIELDS = ["Url", "URL", "BlobUrl", "Blob URL", "FileUrl", "File URL", "Link"];
const LINK_FIELDS = ["RigEquipment", "Equipment", "EquipmentInstance", "EquipmentInstances", "Rig Equipment"];
const ATTACHMENT_FIELDS = ["Attachments", "Files"];
const DATE_FIELDS = ["CreatedAt", "Created", "Date", "Timestamp"];

export async function POST(req: Request) {
  try {
    const TB_DOCS = process.env.TB_DOCS;
    if (!TB_DOCS) {
      return NextResponse.json({ 
        ok: false, 
        error: "Documents table not configured" 
      }, { status: 500 });
    }

    const body = await req.json();
    const { rigEquipmentId, title, docType, url, size, contentType } = body;

    if (!rigEquipmentId) {
      return NextResponse.json({
        ok: false,
        error: "rigEquipmentId required"
      }, { status: 400 });
    }

    const base = getBase();
    const docs = base(TB_DOCS);

    // Get available fields
    const allow = await getTableFields(base, TB_DOCS);
    
    // Helper to find first available field from candidates
    const firstExisting = (candidates: string[]) => candidates.find(f => allow.has(f));

    // Build draft record with available fields
    const draft: Record<string, any> = {};

    // Equipment link (required)
    const linkKey = firstExisting(LINK_FIELDS);
    if (!linkKey) {
      return NextResponse.json({
        ok: false,
        error: "Documents table has no equipment link field"
      }, { status: 400 });
    }
    draft[linkKey] = [rigEquipmentId];

    // Title/Name
    const nameKey = firstExisting(NAME_FIELDS);
    if (nameKey && title) {
      draft[nameKey] = title;
    }

    // Document type
    const typeKey = firstExisting(TYPE_FIELDS);
    if (typeKey && docType) {
      draft[typeKey] = docType;
    }

    // URL or Attachment
    const urlKey = firstExisting(URL_FIELDS);
    if (urlKey && url) {
      draft[urlKey] = url;
    } else {
      // Try attachments if URL field not found
      const attachKey = firstExisting(ATTACHMENT_FIELDS);
      if (attachKey && url) {
        draft[attachKey] = [{
          url,
          filename: title || "document",
          size,
          type: contentType
        }];
      }
    }

    // Created timestamp
    const dateKey = firstExisting(DATE_FIELDS);
    if (dateKey) {
      draft[dateKey] = new Date().toISOString();
    }

    // Filter to only existing fields and create record
    const fields = await setIfExists(base, TB_DOCS, draft);
    const record = await withDeadline(
      docs.create(fields),
      8000,
      'create-document'
    );

    return NextResponse.json({
      ok: true,
      id: record.id
    });

  } catch (e: any) {
    if (e?.message?.includes('deadline')) {
      return NextResponse.json({ 
        ok: false, 
        error: 'deadline', 
        label: e.message 
      }, { status: 503 });
    }
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "document create failed" 
    }, { status: 500 });
  }
}