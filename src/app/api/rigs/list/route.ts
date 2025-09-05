import { NextResponse } from "next/server";
import { listRigs } from "@/lib/airtable";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rigs = await listRigs();
    return NextResponse.json({ ok: true, rigs });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
