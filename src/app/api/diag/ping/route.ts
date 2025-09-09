import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";
export async function GET() {
  return NextResponse.json({
    ok: true,
    kind: "node-ping",
    ts: Date.now(),
    node: process.version,
    region: process.env.VERCEL_REGION || "unknown",
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || "unknown").slice(0,7),
  });
}