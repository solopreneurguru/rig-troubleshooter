import { NextResponse } from "next/server";
import { withDeadline } from "@/lib/deadline";
import Airtable from 'airtable';

function getBase() {
  const API_KEY = process.env.AIRTABLE_API_KEY!;
  const BASE_ID = process.env.AIRTABLE_BASE_ID!;
  if (!API_KEY || !BASE_ID) throw new Error('Airtable env missing');
  
  return new Airtable({
    apiKey: API_KEY,
    endpointUrl: 'https://api.airtable.com',
    requestTimeout: 8000,
  }).base(BASE_ID);
}

const TB_CHATS = process.env.TB_CHATS;
const TB_MESSAGES = process.env.TB_MESSAGES;
const TB_SESSIONS = process.env.TB_SESSIONS;

function requireEnv() {
  const missing: string[] = [];
  if (!TB_CHATS) missing.push("TB_CHATS");
  if (!TB_MESSAGES) missing.push("TB_MESSAGES");
  if (!TB_SESSIONS) missing.push("TB_SESSIONS");
  if (missing.length) {
    const msg = `Missing Airtable env: ${missing.join(", ")}. Configure in Vercel.`;
    const res = NextResponse.json({ ok: false, error: msg }, { status: 422 });
    // @ts-ignore
    res.__chatMissingEnv = true;
    return res;
  }
  return null;
}

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
};

export async function findChatIdBySession(sessionId: string): Promise<string | null> {
  const base = getBase();
  // Filter by linked field via array join; works for 1..n links
  const sel = base(TB_CHATS!).select({
    filterByFormula: `FIND("${sessionId}", ARRAYJOIN({Session}))`,
    pageSize: 1,
  });
  const page = await withDeadline(sel.firstPage(), 8000, "chat.findChat");
  if (page.length) return page[0].id;
  return null;
}

export async function ensureChatForSession(sessionId: string): Promise<string> {
  const base = getBase();
  const existing = await findChatIdBySession(sessionId);
  if (existing) return existing;
  const created = await withDeadline(
    base(TB_CHATS!).create([
      {
        fields: {
          Session: [sessionId],
          StartedAt: new Date().toISOString(),
        },
      },
    ]),
    8000,
    "chat.createChat"
  );
  return created[0].id;
}

export async function listMessages(sessionId: string, limit = 50): Promise<ChatMessage[]> {
  const base = getBase();
  const chatId = await findChatIdBySession(sessionId);
  if (!chatId) return []; // no chat yet
  const sel = base(TB_MESSAGES!).select({
    filterByFormula: `FIND("${chatId}", ARRAYJOIN({Chat}))`,
    sort: [{ field: "CreatedAt", direction: "asc" }],
    pageSize: limit,
  });
  const rows = await withDeadline(sel.firstPage(), 8000, "chat.listMessages");
  return rows.map((r) => ({
    id: r.id,
    role: (r.get("Role") as "user" | "assistant") || "assistant",
    text: (r.get("Text") as string) || "",
    createdAt: (r.get("CreatedAt") as string) || undefined,
  }));
}

export async function appendMessage(opts: {
  sessionId: string;
  role: "user" | "assistant";
  text: string;
}): Promise<{ chatId: string; messageId: string }> {
  const base = getBase();
  const chatId = await ensureChatForSession(opts.sessionId);
  const created = await withDeadline(
    base(TB_MESSAGES!).create([
      {
        fields: {
          Chat: [chatId],
          Session: [opts.sessionId],
          Role: opts.role,
          Text: opts.text,
        },
      },
    ]),
    8000,
    "chat.appendMessage"
  );
  return { chatId, messageId: created[0].id };
}

export function guardEnvOrResponse() {
  const res = requireEnv();
  if (res) return res as NextResponse & { __chatMissingEnv?: boolean };
  return null;
}
