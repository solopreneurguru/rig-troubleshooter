import { NextResponse } from "next/server";
import { guardEnvOrResponse, listMessages, findChatIdBySession } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guarded = guardEnvOrResponse();
  if (guarded) return guarded;

  const { id: sessionId } = await params;
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "Missing sessionId in route" }, { status: 400 });
  }
  try {
    const chatId = await findChatIdBySession(sessionId);
    const messages = await listMessages(sessionId, 100);
    return NextResponse.json({ ok: true, sessionId, chatId, messages });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "chat list failed" }, { status: 500 });
  }
}
