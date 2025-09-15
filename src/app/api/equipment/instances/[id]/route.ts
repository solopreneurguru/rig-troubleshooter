import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getEquipmentInstanceById } from "@/lib/airtable";
import { getId, type IdContext } from "@/lib/route-ctx";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: IdContext
) {
  try {
    const id = await getId(ctx);
    const instance = await getEquipmentInstanceById(id);
    return NextResponse.json({ ok: true, instance });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
