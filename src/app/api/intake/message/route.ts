import { NextResponse } from "next/server";
import { classify } from "@/lib/symptom_map";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, text } = body as { sessionId: string; text: string };
    if (!sessionId || !text) return NextResponse.json({ ok: false, error: "sessionId and text required" }, { status: 400 });

    const { equipment, failureMode, disambiguation, packKeyCandidate } = classify(text);

    // Ensure consistent JSON: { ok: true, equipment, failureMode, packKey, disambiguation } or { ok:false, error }
    return NextResponse.json({
      ok: true,
      equipment,
      failureMode,
      packKey: packKeyCandidate, // may be undefined if ambiguous; UI should handle
      disambiguation
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}