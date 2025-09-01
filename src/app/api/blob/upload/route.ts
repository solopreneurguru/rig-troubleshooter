import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

// Simple CORS for same-origin; expand later if needed
const ok = (body: any, status = 200) =>
  NextResponse.json(body, { status });

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

    // Basic validation (allow PDFs and common images)
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    const type = file.type || "application/octet-stream";
    if (!allowed.includes(type)) {
      return ok({ ok: false, error: `Unsupported type: ${type}` }, 415);
    }

    // Guard local test file size (~20MB max for MVP)
    const MAX = 20 * 1024 * 1024;
    if (typeof file.size === "number" && file.size > MAX) {
      return ok({ ok: false, error: "File too large for server upload (20MB limit in MVP). Use smaller test file." }, 413);
    }

    // Build a unique path in the bucket
    const nameInForm = form.get("filename")?.toString();
    const finalName = nameInForm || (file as any).name || `upload-${Date.now()}`;
    const key = `uploads/${Date.now()}-${finalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const uploaded = await put(key, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: type,
    });

    return ok({ ok: true, blob: uploaded });
  } catch (err: any) {
    return ok({ ok: false, error: String(err?.message || err) }, 500);
  }
}
