import { NextResponse } from "next/server";
import { createOrGetTechByEmail } from "@/lib/airtable";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email } = body || {};
    
    if (!name || !email) {
      return NextResponse.json({ ok: false, error: "name and email are required" }, { status: 400 });
    }

    const tech = await createOrGetTechByEmail(name, email);
    
    return NextResponse.json({ ok: true, techId: tech.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
