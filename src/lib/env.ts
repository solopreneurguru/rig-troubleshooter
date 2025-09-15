// src/lib/env.ts
export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  AIRTABLE_KEY: process.env.AIRTABLE_REST_KEY ?? process.env.AIRTABLE_API_KEY, // fallback
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
  TB_CHATS: process.env.TB_CHATS,
  F_CHAT_TEXT: process.env.F_CHAT_TEXT,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  ADMIN_DEV_TOKEN: process.env.ADMIN_DEV_TOKEN,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
} as const;

export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const v = env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v!;
}
