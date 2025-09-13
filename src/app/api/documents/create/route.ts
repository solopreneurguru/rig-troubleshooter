import { NextResponse } from "next/server";
import { withDeadline } from "@/lib/withDeadline";
import { getTableFields, setIfExists } from "@/lib/airtable-metadata";
import Airtable from "airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TB_DOCS = process.env.TB_DOCS!;

// Common field name patterns
const NAME_FIELDS = ["Title", "Name", "Document Title", "Doc Title"];
const TYPE_FIELDS = ["Type", "DocumentType", "Document Type", "DocType"];
const URL_FIELDS = ["Url", "URL", "BlobUrl", "Blob URL", "FileUrl", "File URL", "Link"];
const LINK_FIELDS = ["RigEquipment", "Equipment", "EquipmentInstance", "EquipmentInstances", "Rig Equipment"];
const ATTACHMENT_FIELDS = ["Attachments", "Files"];
const DATE_FIELDS = ["CreatedAt", "Created", "Date", "Timestamp"];

function getBase() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) throw new Error("Airtable env missing");
  Airtable.configure({ apiKey: AIRTABLE_API_KEY });
  return new Airtable().base(AIRTABLE_BASE_ID);
}

// Validate equipment record ID
const validRecId = (v: any) => typeof v === "string" && v.startsWith("rec") && v.length > 3;

export async function POST(req: Request) {
  try {
    if (!TB_DOCS) {
      return NextResponse.json({ 
        ok: false, 
        error: "Documents table not configured" 
      }, { status: 500 });
    }

    // --- normalize incoming equipment id (accept several keys)
    const body = await req.json().catch(() => ({} as any));

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
    const { title, docType, url, size, contentType } = body;

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
        error: "No link field present in Documents table",
        debug: { linkCandidates: LINK_FIELDS }
      }, { status: 500 });
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
          filename: title || "document"
        }];
      }
    }

    // Created timestamp
    const dateKey = firstExisting(DATE_FIELDS);
    if (dateKey) {
      draft[dateKey] = new Date().toISOString();
    }

    // setIfExists() filters only fields present in the table
    const fields = await setIfExists(base, TB_DOCS, draft);

    // ---- FIX BUILD: safely extract id from Airtable create() result
    const createdRes = (await withDeadline(
      docs.create([{ fields }]) as any,   // cast to any to satisfy TS
      8000,
      "docs-create"
    )) as any;

    const newId =
      Array.isArray(createdRes) ? createdRes[0]?.id : createdRes?.[0]?.id ?? createdRes?.id;

    if (!validRecId(newId)) {
      return NextResponse.json(
        { ok: false, error: "create returned no id", debug: { createdType: typeof createdRes } },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: newId });

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
      error: e?.message || "document create failed",
      hint: "check /api/diag/docs-schema for field info"
    }, { status: 500 });
  }
}