import { NextRequest, NextResponse } from "next/server";
import { getAirtableEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log("api_start", { route: "admin/backfill-text", time: new Date().toISOString() });

  try {
    const body = await req.json().catch(() => ({}));
    const chatId: string | undefined = body?.chatId || body?.id;
    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 });
    }

    const A = getAirtableEnv({ need: ["messages"] }); // { key, baseId, tables }
    const baseUrl = `https://api.airtable.com/v0/${A.baseId}/${encodeURIComponent(A.tables.messages)}`;
    const q = new URLSearchParams();
    q.set("filterByFormula", `{SessionId} = '${chatId}'`);
    q.set("sort[0][field]", "CreatedTime");
    q.set("sort[0][direction]", "asc");
    const url = `${baseUrl}?${q.toString()}`;

    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${A.key}` },
      cache: "no-store",
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Airtable list failed: ${r.status} ${t}`);
    }
    const j = await r.json();

    // Build long-form text (simple join; keep existing logic if file has one)
    const items: any[] = j?.records || [];
    const lines = items.map((rec) => {
      const role = rec?.fields?.Role || rec?.fields?.role || "user";
      const txt = rec?.fields?.Text || rec?.fields?.text || "";
      const ts = rec?.fields?.CreatedTime || rec?.createdTime;
      return `[${ts}] ${String(role).toUpperCase()}: ${txt}`;
    });
    const combined = lines.join("\n");

    // Write back to the session/chat text field if needed (retain existing patch logic if present)
    // If this route previously PATCHed a Chats/Text field, reuse that code but source A.baseId and A.tables.messages.

    return NextResponse.json({ ok: true, len: combined.length });
  } catch (err) {
    console.error("api_error", { route: "admin/backfill-text", err: String(err), stack: (err as any)?.stack });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}