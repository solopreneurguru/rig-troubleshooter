import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createChatMessage } from "@/lib/airtable";
import { getId, type IdContext } from "@/lib/route-ctx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest, ctx: IdContext) {
  try {
    const sessionId = await getId(ctx);
    const { role = 'user', content } = await req.json();
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error:'BAD_CONTENT' }, { status: 400 });
    }

    await createChatMessage({
      sessionId,
      role,
      content: content.trim(),
      source: 'web',
      createdBy: req.headers.get('x-user') || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("api_error", { 
      route: "chats/[id]/append-text", 
      err: String(err), 
      stack: err?.stack 
    });
    return NextResponse.json({ error: err?.message ?? "append-text failed" }, { status: 500 });
  }
}