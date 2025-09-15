import { NextResponse, NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await (context.params instanceof Promise ? context.params : Promise.resolve(context.params));
    const body = await req.json().catch(() => ({}));
    const raw = (body?.message ?? "").toString();
    const message = raw.slice(0, 4000).trim();

    if (!id) return NextResponse.json({ ok: false, error: "session id required" }, { status: 400 });
    if (!message) return NextResponse.json({ ok: false, error: "message required" }, { status: 400 });

    // TODO: Replace this stub with the real assistant pipeline.
    // For now, we echo something useful so the UI flows end-to-end.
    const reply =
      "Got it. (stub) I received: \"" +
      message.replace(/\s+/g, " ").slice(0, 200) +
      "\" — I'm connected and ready once the real assistant is wired.";

    return NextResponse.json({ ok: true, reply });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "server error" }, { status: 500 });
  }
}
