import { NextResponse } from "next/server";
import { envStatus, listRigs } from "@/lib/airtable";

export const runtime = "nodejs"; // Airtable SDK needs Node runtime

export async function GET() {
  try {
    const env = envStatus();
    const rigs = await listRigs(1);
    return NextResponse.json({
      ok: true,
      env,
      sample: rigs,
      hint: rigs.length ? "Read succeeded" : "No rigs found (add one in Airtable).",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}