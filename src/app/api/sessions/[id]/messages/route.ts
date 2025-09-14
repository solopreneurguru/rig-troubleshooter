import { NextResponse } from "next/server";
import { getTableFields } from "@/lib/airtable-metadata"; // already in repo
import { withDeadline } from "@/lib/withDeadline";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TB_CHATS = process.env.AIRTABLE_TABLE_CHATS || "Chats";

// Candidate field names (schema-agnostic)
const SESSION_LINK_FIELDS = ["Session", "RigSession", "SessionId", "Session (link)", "session"];
const ROLE_FIELDS = ["Role", "Sender", "From", "Author"];
const TEXT_FIELDS = ["Text", "Message", "Body", "Content"];
const DOC_ID_FIELDS = ["DocId", "DocumentId", "Document", "Doc"];
const DOC_TITLE_FIELDS = ["DocTitle", "Title", "Document Title"];
const DOC_TYPE_FIELDS = ["DocType", "Type"];
const CREATED_AT_FIELDS = ["CreatedAt", "Created", "Created at"];

const validRecId = (v: any) => typeof v === "string" && /^rec[a-zA-Z0-9]{14}$/.test(v);
const esc = (s: string) => s.replace(/"/g, '\\"');

function pick(keys: string[], fields: Record<string, any>) {
  for (const k of keys) if (k in fields) return k;
  return null;
}

async function getSchema() {
  // metadata helper returns { fields: { name: {type?: string, ...} } } or similar; we only need names
  try { return await getTableFields(null as any, TB_CHATS); } catch { return { fields: {} as Record<string, any> }; }
}

async function airtableFetch(path: string, init?: RequestInit) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(path)}`;
  return withDeadline(fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  }), 10000, "chats-rest");
}

// GET /api/sessions/[id]/messages?limit=50
export async function GET(req: Request, ctx: any) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return NextResponse.json({ ok: false, error: "Missing Airtable env" }, { status: 500 });
  }
  const sessionId = (ctx?.params?.id ?? "").toString();
  if (!validRecId(sessionId)) {
    return NextResponse.json({ ok: false, error: "Invalid session id" }, { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit")) || 50));

  const schema = await getSchema();
  const fields = new Set(Object.keys((schema as any)?.fields || {}));
  const linkKey = [...SESSION_LINK_FIELDS].find(f => fields.has(f)) || "Session";
  const roleKey = [...ROLE_FIELDS].find(f => fields.has(f)) || "Role";
  const textKey = [...TEXT_FIELDS].find(f => fields.has(f)) || "Text";
  const docIdKey = [...DOC_ID_FIELDS].find(f => fields.has(f));
  const docTitleKey = [...DOC_TITLE_FIELDS].find(f => fields.has(f));
  const docTypeKey = [...DOC_TYPE_FIELDS].find(f => fields.has(f));

  // formula tries the link field first; fall back to text equality if SessionId exists as text
  let formula = `FIND("${esc(sessionId)}", ARRAYJOIN({${linkKey}}))`;
  if (!fields.has(linkKey) && fields.has("SessionId")) {
    formula = `{SessionId} = "${esc(sessionId)}"`;
  }

  const q = new URLSearchParams();
  q.set("pageSize", String(limit));
  q.set("sort[0][field]", CREATED_AT_FIELDS.find(f => fields.has(f)) || "CreatedTime");
  q.set("sort[0][direction]", "asc");
  q.set("filterByFormula", formula);

  const res = await airtableFetch(`${TB_CHATS}?${q.toString()}`, { method: "GET" });
  const json = await res.json().catch(() => ({})) as any;
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: "Airtable list failed", status: res.status, body: json }, { status: 502 });
  }

  const items = (json.records || []).map((r: any) => {
    const f = r.fields || {};
    return {
      id: r.id,
      role: f[roleKey] || "assistant",
      text: f[textKey] || "",
      createdAt: f[CREATED_AT_FIELDS.find(k => k in f) || "CreatedTime"] || null,
      docMeta: docIdKey ? {
        id: f[docIdKey] || null,
        title: docTitleKey ? f[docTitleKey] || null : null,
        type: docTypeKey ? f[docTypeKey] || null : null,
      } : null,
    };
  });

  return NextResponse.json({ ok: true, items });
}

// POST /api/sessions/[id]/messages
// body: { role: "user" | "assistant", text: string, docMeta?: {id?: string, title?: string, type?: string} }
export async function POST(req: Request, ctx: any) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return NextResponse.json({ ok: false, error: "Missing Airtable env" }, { status: 500 });
  }
  const sessionId = (ctx?.params?.id ?? "").toString();
  if (!validRecId(sessionId)) {
    return NextResponse.json({ ok: false, error: "Invalid session id" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.text !== "string") {
    return NextResponse.json({ ok: false, error: "text required" }, { status: 400 });
  }

  const schema = await getSchema();
  const fields = new Set(Object.keys((schema as any)?.fields || {}));
  const linkKey = [...SESSION_LINK_FIELDS].find(f => fields.has(f));
  const roleKey = [...ROLE_FIELDS].find(f => fields.has(f));
  const textKey = [...TEXT_FIELDS].find(f => fields.has(f));
  const docIdKey = [...DOC_ID_FIELDS].find(f => fields.has(f));
  const docTitleKey = [...DOC_TITLE_FIELDS].find(f => fields.has(f));
  const docTypeKey = [...DOC_TYPE_FIELDS].find(f => fields.has(f));

  const f: Record<string, any> = {};
  if (textKey) f[textKey] = body.text;
  else f["Text"] = body.text;

  if (roleKey) f[roleKey] = body.role || "user";
  if (linkKey && validRecId(sessionId)) f[linkKey] = [{ id: sessionId }];
  else f["SessionId"] = sessionId; // fallback as plain text if no link field exists

  if (body.docMeta && docIdKey) f[docIdKey] = body.docMeta.id || null;
  if (body.docMeta && docTitleKey) f[docTitleKey] = body.docMeta.title || null;
  if (body.docMeta && docTypeKey) f[docTypeKey] = body.docMeta.type || null;

  // NEVER write CreatedAt; Airtable computes it if present. Avoids 422.
  for (const k of CREATED_AT_FIELDS) delete f[k];

  const res = await airtableFetch(TB_CHATS, {
    method: "POST",
    body: JSON.stringify({ records: [{ fields: f }] }),
  });
  const json = await res.json().catch(() => ({})) as any;

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: "Airtable create failed", status: res.status, body: json }, { status: 502 });
  }

  const recId = json?.records?.[0]?.id;
  return NextResponse.json({ ok: true, id: recId || null });
}
