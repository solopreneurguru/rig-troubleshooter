import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "edge";

export async function GET() {
  const present = Object.fromEntries(
    Object.entries(env).map(([k, v]) => [k, Boolean(v)])
  );
  return NextResponse.json({ ok: true, present, ts: new Date().toISOString() });
}