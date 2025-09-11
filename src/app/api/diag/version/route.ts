import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

export async function GET() {
  try {
    const commit = (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7);
    const region = process.env.VERCEL_REGION || "local";
    
    // Basic table presence check (env vars exist)
    const tablesPresent = [
      process.env.TB_CHATS && "Chats",
      process.env.TB_MESSAGES && "Messages", 
      process.env.TB_SESSIONS && "Sessions",
      process.env.TB_ACTIONS && "Actions",
      process.env.TB_READINGS && "Readings",
      process.env.TB_FINDINGS && "Findings"
    ].filter(Boolean);

    return NextResponse.json({ 
      ok: true, 
      commit, 
      region, 
      tablesPresent,
      marker: "FST-RIG-TS-FP",
      ts: Date.now()
    });
  } catch (e: any) {
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "version check failed" 
    }, { status: 500 });
  }
}
