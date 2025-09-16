import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { airtableGet, airtablePatch, F_CHAT_TEXT } from "@/lib/airtable-rest";
import { getAirtableEnv } from "@/lib/env";
import { getId, type IdContext } from "@/lib/route-ctx";

type Role = "user" | "assistant" | "system";
export const runtime = "nodejs";

type Params = { id: string };

export async function POST(
  req: NextRequest,
  ctx: IdContext
) {
  console.log("api_start", { route: "chats/[id]/append-text", time: new Date().toISOString() });

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
    const A = getAirtableEnv();
    const current = await airtableGet(A.tables.messages, chatId);
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

    await airtablePatch(A.tables.messages, chatId, { [F_CHAT_TEXT]: trimmed });

    return NextResponse.json({ ok: true, len: trimmed.length });
  } catch (err: any) {
    console.error("api_error", { 
      route: "chats/[id]/append-text", 
      err: String(err), 
      stack: err?.stack 
    });
    return NextResponse.json({ error: err?.message ?? "append-text failed" }, { status: 500 });
  }
}