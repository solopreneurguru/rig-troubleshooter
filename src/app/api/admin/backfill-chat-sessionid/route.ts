import { NextResponse } from "next/server";
import { withDeadline } from "@/lib/withDeadline";
import Airtable from "airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

function getBase() {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  if (!API_KEY || !BASE_ID) throw new Error("Airtable env missing");
  
  Airtable.configure({ apiKey: API_KEY });
  return new Airtable().base(BASE_ID);
}

export async function POST(req: Request) {
  try {
    // Token guard
    const adminToken = req.headers.get("x-admin-token");
    const expectedToken = process.env.ADMIN_TOKEN || process.env.ADMIN_DEV_TOKEN;
    
    if (!adminToken || !expectedToken || adminToken !== expectedToken) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
    }

    const TB_CHATS = process.env.TB_CHATS;
    const TB_MESSAGES = process.env.TB_MESSAGES;
    
    if (!TB_CHATS || !TB_MESSAGES) {
      return NextResponse.json({ ok: false, error: "Missing chat table IDs" }, { status: 500 });
    }

    const base = getBase();
    const chats = base(TB_CHATS);
    const messages = base(TB_MESSAGES);
    
    let updatedChats = 0;
    let updatedMessages = 0;

    // 1) Backfill Chats.SessionId from Session links
    const chatsToUpdate = await withDeadline(
      chats.select({
        filterByFormula: "AND(NOT({SessionId}), {Session})",
        fields: ["Session", "SessionId"],
        pageSize: 50
      }).firstPage(),
      8000,
      'chats-select'
    );

    for (const chat of chatsToUpdate) {
      const sessionLinks = (chat.get("Session") as any[]) || [];
      if (sessionLinks.length > 0) {
        const sessionId = sessionLinks[0].id || sessionLinks[0];
        if (sessionId) {
          await withDeadline(
            chats.update(chat.id, { SessionId: sessionId }),
            6000,
            'chat-update'
          );
          updatedChats++;
        }
      }
    }

    // 2) Backfill Messages.Session from Chat→Session links
    const messagesToUpdate = await withDeadline(
      messages.select({
        filterByFormula: "AND(NOT({Session}), {Chat})",
        fields: ["Chat", "Session"],
        pageSize: 50
      }).firstPage(),
      8000,
      'messages-select'
    );

    for (const message of messagesToUpdate) {
      const chatLinks = (message.get("Chat") as any[]) || [];
      if (chatLinks.length > 0) {
        const chatId = chatLinks[0].id || chatLinks[0];
        
        // Get the chat's session link
        const chatRecord = await withDeadline(
          chats.find(chatId),
          4000,
          'chat-find'
        );
        
        const sessionLinks = (chatRecord.get("Session") as any[]) || [];
        if (sessionLinks.length > 0) {
          const sessionId = sessionLinks[0].id || sessionLinks[0];
          await withDeadline(
            messages.update(message.id, { Session: [sessionId] }),
            6000,
            'message-update'
          );
          updatedMessages++;
        }
      }
    }

    return NextResponse.json({ 
      ok: true, 
      updatedChats, 
      updatedMessages,
      note: "Backfill completed - idempotent operation"
    });

  } catch (e: any) {
    if (e?.message?.includes('deadline')) {
      return NextResponse.json({ ok: false, error: 'deadline', label: e.message }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "backfill failed" }, { status: 500 });
  }
}
