import { NextResponse } from "next/server";
import { setSessionFields } from "@/lib/airtable";

export async function POST(req: Request) {
  try {
    const { id, patch } = await req.json();
    if (!id || !patch) return NextResponse.json({ ok: false, error: "Missing id/patch" }, { status: 400 });
    await setSessionFields(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}