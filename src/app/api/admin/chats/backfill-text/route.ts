import { NextRequest, NextResponse } from "next/server";
import { airtablePatch, F_CHAT_TEXT } from "@/lib/airtable-rest";
import { TB_CHATS } from "@/lib/env";

// Helper to list messages for a chat using REST
async function listMessagesForChat(chatId: string) {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TB_MESSAGES = process.env.TB_MESSAGES || "Messages";

  if (!API_KEY || !BASE_ID) throw new Error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TB_MESSAGES)}`;
  const q = new URLSearchParams();
  q.set("filterByFormula", `{SessionId} = '${chatId}'`);
  q.set("sort[0][field]", "CreatedTime");
  q.set("sort[0][direction]", "asc");

  const res = await fetch(`${url}?${q.toString()}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`list messages failed: ${res.status} ${body}`);
  }

  const json = await res.json().catch(() => ({}));
  return (json.records || []).map((r: any) => ({
    role: r.fields.Role || "assistant",
    text: r.fields.Text || "",
    createdAt: r.fields.CreatedTime || r.createdTime || new Date().toISOString(),
  }));
}

// Helper to get chat by ID using REST
async function getChatById(chatId: string) {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!API_KEY || !BASE_ID) throw new Error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TB_CHATS)}/${chatId}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`get chat failed: ${res.status} ${body}`);
  }

  return res.json().catch(() => ({}));
}

export async function POST(req: NextRequest) {
  const { chatId } = await req.json();
  if (!chatId) return NextResponse.json({ ok:false, error:"chatId required" }, { status: 400 });

  // 1) Load Chat and its messages (in chronological order)
  const chat = await getChatById(chatId);
  const messages = await listMessagesForChat(chatId); // return [{role,text,createdAt}, ...]

  const lines = messages.map((m: { createdAt: string | number | Date; role: string; text: string }) => 
    `[${new Date(m.createdAt).toISOString()}] ${m.role.toUpperCase()}: ${m.text}`);
  const text = lines.join("\n");
  await airtablePatch(TB_CHATS, chatId, { [F_CHAT_TEXT]: text.slice(-95_000) });

  return NextResponse.json({ ok:true, count: messages.length });
}
