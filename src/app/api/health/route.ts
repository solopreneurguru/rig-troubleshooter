import { NextResponse } from "next/server";
export const runtime = "nodejs";

export function GET() {
  const p = (k: string) => Boolean(process.env[k]);
  return NextResponse.json({
    ok: true,
    present: {
      AIRTABLE_KEY: p("AIRTABLE_KEY") || p("AIRTABLE_REST_KEY") || p("AIRTABLE_API_KEY"),
      AIRTABLE_BASE_ID: p("AIRTABLE_BASE_ID"),
      TB_CHATS: p("TB_CHATS") || p("TB_MESSAGES"),
      OPENAI_API_KEY: p("OPENAI_API_KEY"),
    },
    ts: new Date().toISOString()
  });
}