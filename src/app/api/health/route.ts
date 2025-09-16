import { NextResponse } from "next/server";
import { getAirtableEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  try {
    const A = getAirtableEnv();
    return NextResponse.json({
      ok: true,
      airtable: {
        key: true,
        baseId: true,
        tables: {
          sessions: true,
          messages: true,
          rigs: true,
          equipment: true,
          docs: true
        }
      },
      time: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
      time: new Date().toISOString()
    }, { status: 500 });
  }
}