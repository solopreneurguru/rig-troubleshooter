import { NextRequest, NextResponse } from "next/server";
import { airtableGet, airtablePatch, TB_CHATS, F_CHAT_TEXT } from "@/lib/airtable-rest";

type Role = "user" | "assistant" | "system";
export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const role: Role = body?.role;
    const text: string = body?.text ?? "";
    if (!id || !text || !role) return NextResponse.json({ ok:false, error:"missing id/role/text" }, { status: 400 });

    // fetch current text (if any)
    const current = await airtableGet(TB_CHATS, id);
    const existing = current?.fields?.[F_CHAT_TEXT] ?? "";

    const ts = new Date().toISOString();
    // Simple, readable line format
    const line = `[${ts}] ${role.toUpperCase()}: ${text}`.trim();

    // Guard: Airtable long text limit ~100k. Keep last ~95k.
    const joined = (existing ? `${existing}\n` : "") + line;
    const MAX = 95_000;
    const trimmed = joined.length > MAX ? joined.slice(joined.length - MAX) : joined;

    await airtablePatch(TB_CHATS, id, { [F_CHAT_TEXT]: trimmed });

    return NextResponse.json({ ok: true, len: trimmed.length });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message ?? "append failed" }, { status: 500 });
  }
}
