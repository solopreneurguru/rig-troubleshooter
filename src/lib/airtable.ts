import Airtable from "airtable";

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
const rigsTableId = process.env.TB_RIGS;

if (!apiKey || !baseId) console.warn("[airtable] Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");

const base = apiKey && baseId ? new Airtable({ apiKey }).base(baseId) : null;

function table(tableId?: string) {
  if (!base) throw new Error("Airtable base not configured");
  if (!tableId) throw new Error("Airtable table ID not provided");
  return base(tableId);
}

export async function listRigs(limit = 5) {
  const tbl = table(rigsTableId);
  const records = await tbl.select({ maxRecords: limit }).firstPage();
  return records.map((r) => ({ id: r.id, ...(r.fields as any) }));
}

export async function createRig(name: string, type?: string, notes?: string) {
  const tbl = table(rigsTableId);
  const recs = await tbl.create([{ fields: { Name: name, Type: type, Notes: notes } as any }]);
  return recs[0].id;
}

export function envStatus() {
  const keys = [
    "AIRTABLE_API_KEY","AIRTABLE_BASE_ID","TB_RIGS","TB_EQUIP_TYPES","TB_RIG_EQUIP",
    "TB_DOCS","TB_SESSIONS","TB_ACTIONS","TB_READINGS","TB_FINDINGS","TB_TECHS","BLOB_READ_WRITE_TOKEN",
  ] as const;
  return Object.fromEntries(keys.map((k) => [k, process.env[k] ? "✓ set" : "✗ missing"]));
}
