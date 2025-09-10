import { NextResponse } from "next/server";
import { appendMessage } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = body?.sessionId as string;
    const role = (body?.role as "user" | "assistant") || "user";
    const text = (body?.text as string) || "";

    if (!sessionId || !text) {
      return NextResponse.json({ ok: false, error: "Missing sessionId or text" }, { status: 422 });
    }

    const { chatId, messageId } = await appendMessage({ sessionId, role, text });
    return NextResponse.json({ ok: true, chatId, messageId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "chat post failed" }, { status: 500 });
  }
}