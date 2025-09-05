import { NextResponse } from "next/server";
import { getSessionById } from "@/lib/airtable";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await getSessionById(sessionId);
    return NextResponse.json({ ok: true, session });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
