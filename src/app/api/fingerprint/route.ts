import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

export async function GET() {
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || "unknown").slice(0,7);
  const region = process.env.VERCEL_REGION || "unknown";
  const marker = "FST-RIG-TS-FP";
  
  return NextResponse.json({
    ok: true,
    kind: "node",
    marker,
    commit: sha,
    region,
    ts: Date.now()
  });
}