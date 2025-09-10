import { NextResponse } from "next/server";
import { listMessagesForSession } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ ok: false, error: "Missing sessionId" }, { status: 422 });

    const { chatId, items } = await listMessagesForSession(id);
    return NextResponse.json({ ok: true, sessionId: id, chatId, messages: items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "chat list failed" }, { status: 500 });
  }
}