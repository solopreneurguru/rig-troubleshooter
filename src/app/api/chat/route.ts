import { NextResponse } from "next/server";
import { listMessagesForSession, appendMessage } from "@/lib/chat";
import { withDeadline } from "@/lib/withDeadline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Missing sessionId" }, { status: 400 });
    }

    const result = await withDeadline(
      listMessagesForSession(sessionId), 
      8000, 
      'chat-list'
    );
    
    return NextResponse.json({ 
      ok: true, 
      sessionId, 
      chatId: result.chatId, 
      messages: result.items 
    });
  } catch (e: any) {
    if (e?.message?.includes('deadline')) {
      return NextResponse.json({ ok: false, error: 'deadline', label: 'chat-list' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "chat list failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = body?.sessionId as string;
    const role = (body?.role as "user" | "assistant") || "user";
    const text = (body?.text as string) || "";

    if (!sessionId || !text) {
      return NextResponse.json({ ok: false, error: "Missing sessionId or text" }, { status: 400 });
    }

    const result = await withDeadline(
      appendMessage({ sessionId, role, text }), 
      8000, 
      'chat-append'
    );
    
    return NextResponse.json({ ok: true, chatId: result.chatId, messageId: result.messageId });
  } catch (e: any) {
    if (e?.message?.includes('deadline')) {
      return NextResponse.json({ ok: false, error: 'deadline', label: 'chat-append' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "chat post failed" }, { status: 500 });
  }
}
