// src/lib/env.ts
type TableKey = "sessions" | "messages" | "rigs" | "equipment" | "docs" | "findings";

function firstEnv(name: string, aliases: string[] = []) {
  const keys = [name, ...aliases];
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.length > 0) return v;
  }
  return undefined;
}

export function requireEnv(name: string, opts?: { fallback?: string; nameForError?: string }) {
  const v = firstEnv(name);
  if (v) return v;
  const label = opts?.nameForError || name;
  if (opts?.fallback !== undefined) return opts.fallback;
  throw new Error(`Missing required env: ${label}`);
}

// Lazy Airtable env. Only validates base/key immediately; tables validate on access.
export function getAirtableEnv(opts?: { need?: TableKey[] }) {
  const key = firstEnv("AIRTABLE_KEY", ["AIRTABLE_REST_KEY", "AIRTABLE_API_KEY"]);
  if (!key) throw new Error("Missing required env: AIRTABLE_KEY (alias: AIRTABLE_REST_KEY or AIRTABLE_API_KEY)");

  const baseId = requireEnv("AIRTABLE_BASE_ID");

  const aliasMap: Record<TableKey, string[]> = {
    sessions: ["TB_SESSIONS", "TB_CHATS", "TB_MESSAGES"],
    messages: ["TB_MESSAGES", "TB_CHATS"],
    rigs:     ["TB_RIGS"],
    equipment:["TB_EQUIPMENT"],
    docs:     ["TB_DOCS"],
    findings: ["TB_FINDINGS"],
  };

  const need = new Set(opts?.need ?? []);
  const tables: Record<string, string> = {};

  for (const [k, aliases] of Object.entries(aliasMap) as [TableKey, string[]][]) {
    Object.defineProperty(tables, k, {
      get() {
        const v = firstEnv(aliases[0], aliases.slice(1));
        if (!v) throw new Error(`Missing required env: ${aliases[0]}`);
        return v;
      },
      enumerable: true,
    });
    // If a route explicitly needs this table, validate it now:
    if (need.has(k)) {
      // trigger getter to validate eagerly for that use-case
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (tables as any)[k];
    }
  }

  return { key, baseId, tables: tables as Record<TableKey, string> };
}

// Tiny boolean snapshot for /api/health without throwing
export function airtablePresence() {
  const present = {
    AIRTABLE_KEY: !!firstEnv("AIRTABLE_KEY", ["AIRTABLE_REST_KEY", "AIRTABLE_API_KEY"]),
    AIRTABLE_BASE_ID: !!firstEnv("AIRTABLE_BASE_ID"),
    TB_SESSIONS: !!firstEnv("TB_SESSIONS") || !!firstEnv("TB_CHATS") || !!firstEnv("TB_MESSAGES"),
    TB_MESSAGES: !!firstEnv("TB_MESSAGES") || !!firstEnv("TB_CHATS"),
    TB_RIGS: !!firstEnv("TB_RIGS"),
    TB_EQUIPMENT: !!firstEnv("TB_EQUIPMENT"),
    TB_DOCS: !!firstEnv("TB_DOCS"),
  };
  return { ok: present.AIRTABLE_KEY && present.AIRTABLE_BASE_ID, present, ts: new Date().toISOString() };
}