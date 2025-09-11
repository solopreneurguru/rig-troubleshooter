import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

// File size limit: 25MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png", 
  "image/jpeg",
  "image/jpg"
];

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const rigEquipmentId = formData.get("rigEquipmentId") as string;
    const title = formData.get("title") as string;
    const docType = formData.get("docType") as string;

    if (!file) {
      return NextResponse.json({ 
        ok: false, 
        error: "No file provided" 
      }, { status: 400 });
    }

    if (!rigEquipmentId || !title) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required fields: rigEquipmentId, title" 
      }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        ok: false, 
        error: `Invalid file type. Allowed: PDF, PNG, JPG. Got: ${file.type}` 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        ok: false, 
        error: `File too large. Maximum size: 25MB. Got: ${Math.round(file.size / 1024 / 1024)}MB` 
      }, { status: 400 });
    }

    // Check for Vercel Blob token
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json({ 
        ok: false, 
        error: "Blob storage not configured" 
      }, { status: 500 });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = file.name.split('.').pop() || 'bin';
    const filename = `docs/${rigEquipmentId}/${timestamp}-${title.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      token: blobToken,
      contentType: file.type
    });

    return NextResponse.json({
      ok: true,
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      contentType: file.type,
      filename: filename
    });

  } catch (e: any) {
    console.error("Blob upload error:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Upload failed" 
    }, { status: 500 });
  }
}