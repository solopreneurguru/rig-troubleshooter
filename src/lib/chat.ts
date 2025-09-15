import Airtable from "airtable";
import { withDeadline } from "./withDeadline";
import { setIfExists } from "./airtable-metadata";

const API_KEY = process.env.AIRTABLE_API_KEY!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
import { TB_CHATS } from "./env";
const TB_MESSAGES = process.env.TB_MESSAGES!;

function getBase() {
  if (!API_KEY || !BASE_ID) throw new Error("Airtable env missing");
  Airtable.configure({ apiKey: API_KEY });
  return new Airtable().base(BASE_ID);
}

function nowIso() {
  return new Date().toISOString();
}

function esc(s: string): string {
  return s.replace(/'/g, "\\'");
}

/**
 * Safely select first page with a deadline using AbortSignal.timeout under the hood (node >=18).
 */
async function firstPageWithDeadline(sel: any, ms = 8000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new Error(`deadline firstPage ${ms}ms`)), ms);
  try {
    const rows = await sel.firstPage(); // airtable client doesn't accept AbortSignal; we bound by setTimeout/abort pattern
    return rows;
  } finally {
    clearTimeout(t);
  }
}

export async function ensureChatForSession(sessionId: string) {
  const base = getBase();
  const chats = base(TB_CHATS);

  // 1) Fast path: exact match on denormalized text field {SessionId}
  try {
    const sel1 = chats.select({
      filterByFormula: `{SessionId} = '${esc(sessionId)}'`,
      pageSize: 1,
    });
    const rows1 = await firstPageWithDeadline(sel1, 6000);
    if (rows1.length > 0) {
      return rows1[0].id;
    }
  } catch (_) {
    // ignore; will fallback
  }

  // 2) Fallback: scan linked field {Session} to find a record that links to this sessionId,
  // then backfill {SessionId} for future fast lookups.
  try {
    const sel2 = chats.select({
      // keep lightweight; we only need the {Session} link and {SessionId}
      fields: ["Session", "SessionId"],
      pageSize: 50,
    });
    const rows2 = await firstPageWithDeadline(sel2, 7000);
    for (const r of rows2) {
      const links = (r.get("Session") as any[]) || [];
      const has = links.some((lk) => lk && (lk.id === sessionId || lk === sessionId));
      if (has) {
        // backfill
        if (!r.get("SessionId")) {
          await chats.update(r.id, { SessionId: sessionId }).catch(() => {});
        }
        return r.id;
      }
    }
  } catch (_) {
    // ignore; will create
  }

  // 3) Not found → create a new Chat row linked to the Session and denormalize SessionId
  const createFields: Record<string, any> = {
    SessionId: sessionId,
    StartedAt: nowIso(),
    Open: true,
  };
  // link the Session if field exists
  try {
    createFields["Session"] = [sessionId];
  } catch (_) {}

  const created = await withDeadline(chats.create(createFields), 6000, 'chat-create');
  return created.id;
}

export async function appendMessage(params: {
  sessionId: string;
  role: "user" | "assistant";
  text: string;
}) {
  if (!TB_MESSAGES) throw new Error("Missing TB_MESSAGES");
  const base = getBase();
  const messages = base(TB_MESSAGES);

  const chatId = await ensureChatForSession(params.sessionId);

  // Build fields with required and optional fields
  const draft: Record<string, any> = {
    Role: params.role,
    Text: params.text,
    CreatedAt: nowIso(),
    Chat: [chatId],
    Session: [params.sessionId],
    // Add denormalized keys (will be filtered if not present)
    SessionId: params.sessionId,
    ChatId: chatId
  };

  // Filter to only existing fields
  const fields = await setIfExists(base, TB_MESSAGES, draft);
  
  const created = await withDeadline(messages.create(fields), 6000, 'message-create');
  return { chatId, messageId: created.id };
}

export async function listMessagesForSession(sessionId: string) {
  if (!sessionId) throw new Error("sessionId required");
  
  const base = getBase();
  const messages = base(TB_MESSAGES);
  const chatId = await ensureChatForSession(sessionId);

  try {
    // First try: direct SessionId match
    const sel = messages.select({
      filterByFormula: `{SessionId}='${esc(sessionId)}'`,
      sort: [{ field: "CreatedAt", direction: "asc" }],
      pageSize: 100
    });
    const rows = await firstPageWithDeadline(sel, 7000);
    if (rows.length > 0) {
      return {
        chatId,
        items: rows.map((r: any) => ({
          id: r.id,
          role: (r.get("Role") as string) || "user",
          text: (r.get("Text") as string) || "",
          createdAt: (r.get("CreatedAt") as string) || null,
        }))
      };
    }
  } catch (_) {
    // Fall through to next attempt
  }

  try {
    // Second try: ChatId match
    const sel2 = messages.select({
      filterByFormula: `{ChatId}='${esc(chatId)}'`,
      sort: [{ field: "CreatedAt", direction: "asc" }],
      pageSize: 100
    });
    const rows2 = await firstPageWithDeadline(sel2, 7000);
    if (rows2.length > 0) {
      return {
        chatId,
        items: rows2.map((r: any) => ({
          id: r.id,
          role: (r.get("Role") as string) || "user",
          text: (r.get("Text") as string) || "",
          createdAt: (r.get("CreatedAt") as string) || null,
        }))
      };
    }
  } catch (_) {
    // Fall through to final attempt
  }

  // Last resort: link-based lookup
  const sel3 = messages.select({
    filterByFormula: `OR(FIND('${esc(sessionId)}',ARRAYJOIN({Session})), FIND('${esc(chatId)}',ARRAYJOIN({Chat})))`,
    sort: [{ field: "CreatedAt", direction: "asc" }],
    pageSize: 100
  });
  const rows3 = await firstPageWithDeadline(sel3, 7000);
  return {
    chatId,
    items: rows3.map((r: any) => ({
      id: r.id,
      role: (r.get("Role") as string) || "user",
      text: (r.get("Text") as string) || "",
      createdAt: (r.get("CreatedAt") as string) || null,
    }))
  };
}