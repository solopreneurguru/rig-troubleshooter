import Airtable from "airtable";

const API_KEY = process.env.AIRTABLE_API_KEY!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TB_CHATS = process.env.TB_CHATS!;
const TB_MESSAGES = process.env.TB_MESSAGES!;

function getBase() {
  if (!API_KEY || !BASE_ID) throw new Error("Airtable env missing");
  Airtable.configure({ apiKey: API_KEY });
  return new Airtable().base(BASE_ID);
}

function nowIso() {
  return new Date().toISOString();
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
  if (!TB_CHATS) throw new Error("Missing TB_CHATS");
  const base = getBase();
  const chats = base(TB_CHATS);

  // 1) Fast path: exact match on denormalized text field {SessionId}
  try {
    const sel1 = chats.select({
      filterByFormula: `{SessionId} = "${sessionId}"`,
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

  const created = await chats.create(createFields);
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

  const fields: Record<string, any> = {
    Role: params.role,
    Text: params.text,
    CreatedAt: nowIso(),
    Chat: [chatId],
  };
  try {
    fields["Session"] = [params.sessionId];
  } catch (_) {}

  const created = await messages.create(fields);
  return { chatId, messageId: created.id };
}

export async function listMessagesForSession(sessionId: string) {
  const base = getBase();
  const chatId = await ensureChatForSession(sessionId);

  // Try filter-by Chat link; fall back to scan if needed
  const messages = base(TB_MESSAGES);
  try {
    const sel = messages.select({
      // Airtable doesn't let us filter by linked id natively; use ARRAYJOIN fallback
      filterByFormula: `FIND("${chatId}", ARRAYJOIN({Chat}))`,
      sort: [{ field: "CreatedAt", direction: "asc" }],
      pageSize: 50,
    });
    const rows = await firstPageWithDeadline(sel, 7000);
    return { chatId, items: rows.map((r: any) => ({
      id: r.id,
      role: (r.get("Role") as string) || "user",
      text: (r.get("Text") as string) || "",
      createdAt: (r.get("CreatedAt") as string) || null,
    })) };
  } catch (_) {
    // brute-force fallback: fetch small page and filter in app
    const sel2 = messages.select({
      fields: ["Chat", "Role", "Text", "CreatedAt"],
      sort: [{ field: "CreatedAt", direction: "asc" }],
      pageSize: 50,
    });
    const rows2 = await firstPageWithDeadline(sel2, 7000);
    const items = rows2
      .filter((r: any) => {
        const links = (r.get("Chat") as any[]) || [];
        return links.some((lk) => lk && (lk.id === chatId || lk === chatId));
      })
      .map((r: any) => ({
        id: r.id,
        role: (r.get("Role") as string) || "user",
        text: (r.get("Text") as string) || "",
        createdAt: (r.get("CreatedAt") as string) || null,
      }));
    return { chatId, items };
  }
}