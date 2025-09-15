export const TB_CHATS = "Chats";
export const F_CHAT_TEXT = "Text";

export async function airtableGet(table: string, id: string) {
  const API_KEY = process.env.AIRTABLE_REST_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  if (!API_KEY || !BASE_ID) throw new Error("Missing AIRTABLE_REST_KEY or AIRTABLE_BASE_ID");

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}/${id}?fields[]=${F_CHAT_TEXT}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`airtable get failed: ${res.status} ${body}`);
  }

  const json = await res.json().catch(() => ({}));
  return json;
}

export async function airtableCreate(
  tableName: string,
  fields: Record<string, any>,
  opts?: { returnRaw?: boolean }
): Promise<{ id: string; raw?: any }> {
  const API_KEY = process.env.AIRTABLE_REST_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  if (!API_KEY || !BASE_ID) throw new Error("Missing AIRTABLE_REST_KEY or AIRTABLE_BASE_ID");

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ records: [{ fields }] }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`airtable create failed: ${res.status} ${body}`);
  }

  const json: any = await res.json().catch(() => ({}));
  const id = json?.records?.[0]?.id;
  if (!id) throw new Error("airtable create ok but no record id");
  return opts?.returnRaw ? { id, raw: json } : { id };
}

export async function airtablePatch(
  tableName: string,
  recordId: string,
  fields: Record<string, any>,
  opts?: { returnRaw?: boolean }
): Promise<{ id: string; raw?: any }> {
  const API_KEY = process.env.AIRTABLE_REST_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  if (!API_KEY || !BASE_ID) throw new Error("Missing AIRTABLE_REST_KEY or AIRTABLE_BASE_ID");

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ records: [{ id: recordId, fields }] }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`airtable patch failed: ${res.status} ${body}`);
  }

  const json: any = await res.json().catch(() => ({}));
  const id = json?.records?.[0]?.id;
  if (!id) throw new Error("airtable patch ok but no record id");
  return opts?.returnRaw ? { id, raw: json } : { id };
}