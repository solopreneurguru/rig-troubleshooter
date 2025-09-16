import { NextResponse } from "next/server";
import { getAirtableEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  try {
    const A = getAirtableEnv();
    return NextResponse.json({
      ok: true,
      present: {
        AIRTABLE_KEY: true,
        AIRTABLE_BASE_ID: true,
        TB_SESSIONS: true,
        TB_MESSAGES: true,
        TB_RIGS: true,
        TB_EQUIPMENT: true,
        TB_DOCS: true,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
      },
      ts: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      ts: new Date().toISOString()
    }, { status: 500 });
  }
}