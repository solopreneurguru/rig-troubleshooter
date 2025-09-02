import { NextResponse } from "next/server";
import { createDocument } from "@/lib/airtable";

export const runtime = "nodejs";

export async function GET() {
  try {
    const res = await createDocument({
      Title: "Write Test " + Date.now(),
      BlobURL: "https://example.com/test.pdf",
      DocType: "Other",
      Notes: "Automated write test",
    });
    return NextResponse.json({ ok: true, id: res.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
