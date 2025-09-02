import Airtable from "airtable";

const apiKey = process.env.AIRTABLE_API_KEY?.trim();
const baseId = process.env.AIRTABLE_BASE_ID;
const rigsTableId = process.env.TB_RIGS;
const docsTableId = process.env.TB_DOCS;

if (!apiKey || !baseId) {
  console.warn("[airtable] Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
}

const base = apiKey && baseId ? new Airtable({ apiKey }).base(baseId) : null;

function table(tableId?: string) {
  if (!base) throw new Error("Airtable base not configured");
  if (!tableId) throw new Error("Airtable table ID not provided");
  return base(tableId);
}

// ---------- Rigs ----------
export async function listRigs(limit = 50) {
  const tbl = table(rigsTableId);
  const records = await tbl.select({ maxRecords: limit }).firstPage();
  return records.map((r) => ({ id: r.id, ...(r.fields as any) }));
}

export async function findRigByName(name: string) {
  if (!name || !rigsTableId) return null;
  const tbl = table(rigsTableId);
  // Conservative approach: search a page and match in JS (avoids formula quoting issues)
  const records = await tbl.select({ maxRecords: 50 }).firstPage();
  const match = records.find((r) => (r.fields as any).Name === name);
  return match ? { id: match.id, ...(match.fields as any) } : null;
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

// ---------- Documents ----------
type CreateDocumentInput = {
  Title: string;
  DocType?: string;
  BlobURL: string;
  MimeType?: string;
  SizeBytes?: number;
  Filename?: string;
  Notes?: string;
  RigId?: string;       // optional link to Rigs
  SessionId?: string;   // reserved for future linking
};

export async function createDocument(fields: CreateDocumentInput) {
  const tbl = table(docsTableId);
  const payload: any = {
    Title: fields.Title,
    BlobURL: fields.BlobURL,
  };
  if (fields.DocType) payload.DocType = fields.DocType;
  if (fields.MimeType) payload.MimeType = fields.MimeType;
  if (fields.SizeBytes != null) payload.SizeBytes = fields.SizeBytes;
  if (fields.Filename) payload.Filename = fields.Filename;
  if (fields.Notes) payload.Notes = fields.Notes;
  if (fields.RigId) payload.Rig = [{ id: fields.RigId }];

  const recs = await tbl.create([{ fields: payload }]);
  return { id: recs[0].id, fields: recs[0].fields as any };
}