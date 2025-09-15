// src/lib/env.ts

export function requireEnv(
  names: string[] | string,
  optsOrAliases?: { fallback?: string; nameForError?: string } | string[]
) {
  // Normalize names to a list
  const list: string[] = Array.isArray(names) ? [...names] : [names];

  // If second arg is an alias array, append; if it's options, keep them
  let opts: { fallback?: string; nameForError?: string } | undefined;
  if (Array.isArray(optsOrAliases)) {
    list.push(...optsOrAliases);
  } else if (optsOrAliases) {
    opts = optsOrAliases;
  }

  for (const n of list) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }

  if (opts?.fallback !== undefined) return opts.fallback;
  const label = opts?.nameForError || list.join(" | ");
  throw new Error(`Missing required env: ${label}`);
}

// Aliases for Airtable key (REST or SDK)
export const AIRTABLE_KEY = requireEnv(
  ["AIRTABLE_REST_KEY", "AIRTABLE_API_KEY", "AIRTABLE_KEY"],
  { nameForError: "AIRTABLE_REST_KEY|AIRTABLE_API_KEY|AIRTABLE_KEY" }
);

export const AIRTABLE_BASE_ID = requireEnv("AIRTABLE_BASE_ID");

// Table name aliases / fallbacks (do not throw; allow defaults)
export const TB_CHATS =
  process.env.TB_CHATS || process.env.TB_MESSAGES || "Chats";

export const TB_MESSAGES =
  process.env.TB_MESSAGES || process.env.TB_CHATS || "Messages";

export const TB_SESSIONS =
  process.env.TB_SESSIONS || process.env.SESSIONS || "Sessions";