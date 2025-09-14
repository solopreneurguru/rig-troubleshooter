import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const tip = [
      "What mode is selected right now?",
      "Can you read the VFD's actual RPM and commanded RPM?",
      "Any recent parameter changes or faults logged?"
    ];
    const reply =
      `Got it. I'll help. First, I want to verify a few basics:\n` +
      tip.map((t, i) => `${i + 1}. ${t}`).join("\n");
    // TODO: persist assistant message to session store; for now, return it.
    return NextResponse.json({ ok: true, reply });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 400 });
  }
}
