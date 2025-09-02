import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createDocument, findRigByName } from "@/lib/airtable";

export const runtime = "nodejs";

const ok = (body: any, status = 200) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return ok({ ok: false, error: "BLOB_READ_WRITE_TOKEN missing" }, 500);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return ok({ ok: false, error: "file field missing" }, 400);
    }

    // Metadata inputs from the form
    const title = form.get("title")?.toString() || (file as any).name || `Upload ${Date.now()}`;
    const docType = form.get("doctype")?.toString();     // Electrical/Hydraulic/Manual/PLC/Photo/Other
    const rigName = form.get("rigName")?.toString();     // optional: try to link to Rigs
    const notes = form.get("notes")?.toString();

    const allowed = ["application/pdf","image/jpeg","image/png","image/webp"];
    const type = (file as any).type || "application/octet-stream";
    if (!allowed.includes(type)) return ok({ ok: false, error: `Unsupported type: ${type}` }, 415);

    const MAX = 20 * 1024 * 1024; // 20MB MVP
    const size = (file as any).size as number | undefined;
    if (typeof size === "number" && size > MAX) {
      return ok({ ok: false, error: "File too large (20MB limit in MVP)." }, 413);
    }

    const rawName = (file as any).name || `upload-${Date.now()}`;
    const finalName = form.get("filename")?.toString() || rawName;
    const key = `uploads/${Date.now()}-${finalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const uploaded = await put(key, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: type,
    });

    // Try to link to a rig if rigName provided
    let rigId: string | undefined = undefined;
    if (rigName) {
      try {
        const rig = await findRigByName(rigName);
        if (rig?.id) rigId = rig.id;
      } catch {}
    }

    // Create Airtable Document row if TB_DOCS is configured
    let documentId: string | undefined;
    if (process.env.TB_DOCS) {
      try {
        const doc = await createDocument({
          Title: title,
          DocType: docType,
          BlobURL: uploaded.url,
          MimeType: type,
          SizeBytes: typeof size === "number" ? size : undefined,
          Filename: finalName,
          Notes: notes,
          RigId: rigId,
        });
        documentId = doc.id;
      } catch (e: any) {
        // Don't fail the upload if Airtable write fails; return a warning
        return ok({ ok: true, blob: uploaded, warning: `Upload ok, but Airtable doc create failed: ${String(e?.message || e)}` });
      }
    }

    return ok({ ok: true, blob: uploaded, documentId, linkedRigId: rigId });
  } catch (err: any) {
    return ok({ ok: false, error: String(err?.message || err) }, 500);
  }
}
