import { NextResponse } from "next/server";
import { getSessionById } from "@/lib/airtable";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionById(id);
    return NextResponse.json({ ok: true, session });
  } catch (e: any) {
    return NextResponse.json({ 
      error: 'SESSION_GET_FAILED', 
      detail: String(e?.message ?? e) 
    }, { status: 500 });
  }
}
