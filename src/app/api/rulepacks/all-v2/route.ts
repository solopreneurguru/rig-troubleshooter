import { NextResponse } from "next/server";
import { listActiveV2PacksAll } from "@/lib/rulepacks";

export async function GET() {
  try {
    const packs = await listActiveV2PacksAll();
    return NextResponse.json({ ok: true, packs });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
