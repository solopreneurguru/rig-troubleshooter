import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { airtableGet, airtablePatch, F_CHAT_TEXT } from "@/lib/airtable-rest";
import { TB_CHATS } from "@/lib/env";
import { getId, type IdContext } from "@/lib/route-ctx";

type Role = "user" | "assistant" | "system";
export const runtime = "nodejs";

type Params = { id: string };

export async function POST(
  req: NextRequest,
  ctx: IdContext
) {
  try {
    const chatId = await getId(ctx);
    const body = await req.json().catch(() => ({}));
    const { text, append, role, prefix, suffix } = body ?? {};

    const line = (text ?? append)?.toString().trim();
    if (!line) {
      return NextResponse.json(
        { error: "Missing text. Send { text: string } (or { append: string })." },
        { status: 400 }
      );
    }

    // fetch current text (if any)
    const current = await airtableGet(TB_CHATS, chatId);
    const existing = current?.fields?.[F_CHAT_TEXT] ?? "";

    // normalize line with role/prefix/suffix
    const stamp = new Date().toISOString();
    const normalized =
      [prefix, role ? role.toUpperCase() + ":" : null, line, suffix]
        .filter(Boolean)
        .join(" ").trim();

    // Guard: Airtable long text limit ~100k. Keep last ~95k.
    const joined = (existing ? `${existing}\n` : "") + `[${stamp}] ${normalized}`;
    const MAX = 95_000;
    const trimmed = joined.length > MAX ? joined.slice(joined.length - MAX) : joined;

    await airtablePatch(TB_CHATS, chatId, { [F_CHAT_TEXT]: trimmed });

    return NextResponse.json({ ok: true, len: trimmed.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "append-text failed" }, { status: 500 });
  }
}
