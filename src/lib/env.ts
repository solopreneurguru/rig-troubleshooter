// src/lib/env.ts
export const env = process.env;

export function requireEnv(name: string, aliases: string[] = []): string {
  const val =
    env[name] ??
    (aliases.length ? aliases.map(a => env[a]).find(Boolean) : undefined);
  if (!val) {
    const also = aliases.length ? ` (aliases: ${aliases.join(", ")})` : "";
    throw new Error(`Missing env: ${name}${also}`);
  }
  return val;
}

// Common env vars with aliases
export const AIRTABLE_KEY = requireEnv("AIRTABLE_KEY", ["AIRTABLE_REST_KEY", "AIRTABLE_API_KEY"]);
export const AIRTABLE_BASE_ID = requireEnv("AIRTABLE_BASE_ID");
export const TB_CHATS = requireEnv("TB_CHATS", ["TB_MESSAGES"]);
export const OPENAI_API_KEY = requireEnv("OPENAI_API_KEY");
