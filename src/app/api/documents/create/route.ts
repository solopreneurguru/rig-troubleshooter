import { NextResponse } from "next/server";
import { withDeadline } from "@/lib/withDeadline";
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { rigEquipmentId, title, docType, url, size, contentType } = body;

    if (!rigEquipmentId || !title || !url) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required fields: rigEquipmentId, title, url" 
      }, { status: 400 });
    }

    const TB_DOCS = process.env.TB_DOCS;
    if (!TB_DOCS) {
      return NextResponse.json({ 
        ok: false, 
        error: "Documents table not configured" 
      }, { status: 500 });
    }

    const base = getBase();
    const documents = base(TB_DOCS);

    // Create document record
    const documentFields: any = {
      RigEquipment: [rigEquipmentId],
      Title: title,
      Url: url,
      UploadedAt: new Date().toISOString()
    };

    // Add optional fields if provided
    if (docType) {
      documentFields.DocType = docType;
    }
    
    if (size) {
      documentFields.Size = size;
    }
    
    if (contentType) {
      documentFields.ContentType = contentType;
    }

    const documentRecord = await withDeadline(
      documents.create(documentFields),
      8000,
      'create-document'
    );

    return NextResponse.json({
      ok: true,
      documentId: (documentRecord as any).id,
      title,
      docType,
      url
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
      error: e?.message || "document creation failed" 
    }, { status: 500 });
  }
}
