// src/lib/env.ts

export function requireEnv(
  names: string[] | string,
  opts?: { fallback?: string; nameForError?: string }
) {
  const arr = Array.isArray(names) ? names : [names];
  for (const n of arr) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  if (opts?.fallback !== undefined) return opts.fallback;
  const label = opts?.nameForError || arr.join(" | ");
  throw new Error(`Missing required env: ${label}`);
}

// Aliases for Airtable key (REST or SDK)
export const AIRTABLE_KEY = requireEnv(
  ["AIRTABLE_REST_KEY", "AIRTABLE_API_KEY", "AIRTABLE_KEY"],
  { nameForError: "AIRTABLE_REST_KEY|AIRTABLE_API_KEY|AIRTABLE_KEY" }
);

export const AIRTABLE_BASE_ID = requireEnv("AIRTABLE_BASE_ID");

// Table name aliases / fallbacks (do not throw; allow default)
export const TB_CHATS =
  process.env.TB_CHATS || process.env.TB_MESSAGES || "Chats";

export const TB_MESSAGES =
  process.env.TB_MESSAGES || process.env.TB_CHATS || "Messages";

// You can add more shared names here as needed:
export const TB_SESSIONS =
  process.env.TB_SESSIONS || process.env.SESSIONS || "Sessions";