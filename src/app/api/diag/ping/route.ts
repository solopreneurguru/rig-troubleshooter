import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";
export async function GET() {
  const region = (process.env.VERCEL_REGION || "unknown");
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA || "unknown").slice(0,7);
  return NextResponse.json({
    ok: true,
    ts: Date.now(),
    node: process.version,
    region,
    commit,
    note: "pure route; proves serverless executes",
  });
}
