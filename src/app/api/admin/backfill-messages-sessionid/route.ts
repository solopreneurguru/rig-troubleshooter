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
    // Verify admin token
    const token = req.headers.get("x-admin-token");
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
    if (!token || token !== ADMIN_TOKEN) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const TB_MESSAGES = process.env.TB_MESSAGES;
    if (!TB_MESSAGES) {
      return NextResponse.json({ ok: false, error: "Messages table not configured" }, { status: 500 });
    }

    const base = getBase();
    const messages = base(TB_MESSAGES);

    // Get messages that have links but no denormalized IDs
    const records = await withDeadline(
      messages.select({
        filterByFormula: "OR(AND(NOT({SessionId}),NOT(BLANK({Session}))), AND(NOT({ChatId}),NOT(BLANK({Chat}))))",
        fields: ["Session", "SessionId", "Chat", "ChatId"]
      }).firstPage(),
      8000,
      'list-messages'
    );

    let updatedSessionId = 0;
    let updatedChatId = 0;

    // Process in batches of 10
    const batches = [];
    for (let i = 0; i < records.length; i += 10) {
      batches.push(records.slice(i, i + 10));
    }

    for (const batch of batches) {
      const updates = batch.map(record => {
        const update: Record<string, any> = {};
        
        // Get first Session link ID if present and SessionId missing
        const sessionLinks = (record.get("Session") as any[]) || [];
        if (sessionLinks.length > 0 && !record.get("SessionId")) {
          const sessionId = sessionLinks[0]?.id || sessionLinks[0];
          if (sessionId) {
            update.SessionId = sessionId;
            updatedSessionId++;
          }
        }

        // Get first Chat link ID if present and ChatId missing
        const chatLinks = (record.get("Chat") as any[]) || [];
        if (chatLinks.length > 0 && !record.get("ChatId")) {
          const chatId = chatLinks[0]?.id || chatLinks[0];
          if (chatId) {
            update.ChatId = chatId;
            updatedChatId++;
          }
        }

        return {
          id: record.id,
          fields: update
        };
      }).filter(update => Object.keys(update.fields).length > 0);

      if (updates.length > 0) {
        await withDeadline(
          messages.update(updates),
          8000,
          'update-messages'
        );
      }
    }

    return NextResponse.json({
      ok: true,
      updatedSessionId,
      updatedChatId,
      total: records.length
    });

  } catch (e: any) {
    if (e?.message?.includes('deadline')) {
      return NextResponse.json({ 
        ok: false, 
        error: 'deadline', 
        label: e.message 
      }, { status: 503 });
    }
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "backfill failed" 
    }, { status: 500 });
  }
}
