import { NextResponse } from "next/server";
import { guardEnvOrResponse, appendMessage } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

export async function POST(req: Request) {
  const guarded = guardEnvOrResponse();
  if (guarded) return guarded;

  const body = await req.json().catch(() => ({}));
  const sessionId = body?.sessionId as string | undefined;
  const role = (body?.role as "user" | "assistant") || "user";
  const text = (body?.text as string) || "";

  if (!sessionId || text.trim().length < 1) {
    return NextResponse.json(
      { ok: false, error: "sessionId and non-empty text are required" },
      { status: 422 }
    );
  }

  try {
    const { chatId, messageId } = await appendMessage({ sessionId, role, text });
    return NextResponse.json({ ok: true, chatId, messageId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "chat post failed" }, { status: 500 });
  }
}
