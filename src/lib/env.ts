export type AirtableEnv = {
  key: string;
  baseId: string;
  tables: {
    sessions: string;
    messages: string;
    rigs: string;
    equipment: string;
    docs: string;
    findings: string;
  };
};

function firstEnv(name: string, aliases: string[] = []) {
  const keys = [name, ...aliases];
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

export function requireEnv(name: string, opts?: { aliases?: string[]; nameForError?: string }) {
  const aliases = opts?.aliases ?? [];
  const label = opts?.nameForError ?? name;
  const candidates = [name, ...aliases];
  for (const k of candidates) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  throw new Error(`Missing required env: ${label} (tried: ${candidates.join(", ")})`);
}

export function getAirtableEnv(): AirtableEnv {
  const key = requireEnv("AIRTABLE_KEY", {
    aliases: ["AIRTABLE_REST_KEY", "AIRTABLE_API_KEY"],
    nameForError: "AIRTABLE_KEY",
  });
  const baseId = requireEnv("AIRTABLE_BASE_ID");

  const sessions = requireEnv("TB_SESSIONS", {
    aliases: ["TB_SESSION", "TB_SESSION_LOGS", "TB_SESSION_EVENTS"],
    nameForError: "TB_SESSIONS",
  });
  const messages = requireEnv("TB_CHATS", {
    aliases: ["TB_MESSAGES", "TB_CHAT_MESSAGES", "TB_CONVERSATIONS"],
    nameForError: "TB_CHATS",
  });
  const rigs = requireEnv("TB_RIGS", {
    aliases: ["TB_RIG", "TB_RIGS_TABLE"],
    nameForError: "TB_RIGS",
  });
  const equipment = requireEnv("TB_EQUIPMENT", {
    aliases: ["TB_EQUIPMENT_INSTANCES", "TB_EQUIP", "TB_EQUIPMENT_TABLE", "TB_INSTANCES"],
    nameForError: "TB_EQUIPMENT",
  });
  const docs = requireEnv("TB_DOCS", {
    aliases: ["TB_DOCUMENTS", "TB_FILES", "TB_ASSETS"],
    nameForError: "TB_DOCS",
  });
  const findings = requireEnv("TB_FINDINGS", {
    aliases: ["TB_FINDING", "TB_FINDINGS_TABLE"],
    nameForError: "TB_FINDINGS",
  });

  return { key, baseId, tables: { sessions, messages, rigs, equipment, docs, findings } };
}