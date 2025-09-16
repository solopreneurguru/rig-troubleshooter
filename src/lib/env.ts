export type RequireEnvOpts = {
  aliases?: string[];
  fallback?: string;
  nameForError?: string; // overrides the name that appears in error messages
};

/** Return the first defined env among [name, ...aliases], or fallback, else throw. */
export function requireEnv(
  name: string,
  opts: RequireEnvOpts = {}
): string {
  const candidates = [name, ...(opts.aliases || [])];
  for (const key of candidates) {
    const v = process.env[key];
    if (v && v.length > 0) return v;
  }
  if (opts.fallback !== undefined) return opts.fallback;
  const label = opts.nameForError ?? name;
  throw new Error(`Missing required env: ${label}`);
}

/** Canonicalized set of Airtable + tables pulled from env with aliases. */
export function getAirtableEnv() {
  const key = requireEnv("AIRTABLE_KEY", { aliases: ["AIRTABLE_REST_KEY", "AIRTABLE_API_KEY"] });
  const baseId = requireEnv("AIRTABLE_BASE_ID");
  const tables = {
    sessions: requireEnv("TB_SESSIONS"),
    messages: requireEnv("TB_MESSAGES", { aliases: ["TB_CHATS"] }),
    rigs: requireEnv("TB_RIGS"),
    equipment: requireEnv("TB_EQUIPMENT"),
    docs: requireEnv("TB_DOCS"),
  };
  return { key, baseId, tables };
}