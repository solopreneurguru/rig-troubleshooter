import Airtable from "airtable";

const apiKey = process.env.AIRTABLE_API_KEY?.trim();
const baseId = process.env.AIRTABLE_BASE_ID;
const rigsTableId = process.env.TB_RIGS;
const docsTableId = process.env.TB_DOCS;
const sessionsTableId = process.env.TB_SESSIONS;
const actionsTableId = process.env.TB_ACTIONS;
const readingsTableId = process.env.TB_READINGS;

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
  const records = await tbl.select({ maxRecords: 50 }).firstPage();
  const match = records.find((r) => (r.fields as any).Name === name);
  return match ? { id: match.id, ...(match.fields as any) } : null;
}

export async function createRig(name: string, type?: string, notes?: string) {
  const tbl = table(rigsTableId);
  const recs = await tbl.create([{ fields: { Name: name, Type: type, Notes: notes } as any }]);
  return recs[0].id;
}

// ---------- Documents ----------
type CreateDocumentInput = {
  Title: string; DocType?: string; BlobURL: string; MimeType?: string;
  SizeBytes?: number; Filename?: string; Notes?: string; RigId?: string; SessionId?: string;
};
export async function createDocument(fields: CreateDocumentInput) {
  const tbl = table(docsTableId);
  const payload: any = { Title: fields.Title, BlobURL: fields.BlobURL };
  if (fields.DocType) payload.DocType = fields.DocType;
  if (fields.MimeType) payload.MimeType = fields.MimeType;
  if (fields.SizeBytes != null) payload.SizeBytes = fields.SizeBytes;
  if (fields.Filename) payload.Filename = fields.Filename;
  if (fields.Notes) payload.Notes = fields.Notes;
  if (fields.RigId) payload.Rig = [{ id: fields.RigId }];
  const recs = await tbl.create([{ fields: payload }]);
  return { id: recs[0].id, fields: recs[0].fields as any };
}

// ---------- Sessions / Actions / Readings ----------
export async function createSession(title: string, problem?: string, rigId?: string) {
  const tbl = table(sessionsTableId);
  const fields: any = { Title: title || `Session ${Date.now()}`, Problem: problem || "", Status: "Open" };
  if (rigId) fields.Rig = [{ id: rigId }];
  const recs = await tbl.create([{ fields }]);
  return recs[0].id;
}

export type Step = {
  key: string;
  instruction: string;
  expect?: string;
  citation?: string;
};

export async function createAction(sessionId: string, order: number, step: Step) {
  const tbl = table(actionsTableId);
  const fields: any = {
    Session: [{ id: sessionId }],
    StepKey: step.key,
    Instruction: step.instruction,
    Expected: step.expect || "",
    Citation: step.citation || "",
    Order: order,
    Result: "pending",
  };
  const recs = await tbl.create([{ fields }]);
  return recs[0].id;
}

export async function updateActionResult(actionId: string, result: "pass"|"fail") {
  const tbl = table(actionsTableId);
  await tbl.update([{ id: actionId, fields: { Result: result } as any }]);
}

export async function createReading(actionId: string, value: string, unit?: string, passFail?: "pass"|"fail") {
  const tbl = table(readingsTableId);
  const fields: any = { Action: [{ id: actionId }], Value: value };
  if (unit) fields.Unit = unit;
  if (passFail) fields.PassFail = passFail;
  const recs = await tbl.create([{ fields }]);
  return recs[0].id;
}

export function envStatus() {
  const keys = [
    "AIRTABLE_API_KEY","AIRTABLE_BASE_ID","TB_RIGS","TB_EQUIP_TYPES","TB_RIG_EQUIP",
    "TB_DOCS","TB_SESSIONS","TB_ACTIONS","TB_READINGS","TB_FINDINGS","TB_TECHS","BLOB_READ_WRITE_TOKEN",
  ] as const;
  return Object.fromEntries(keys.map((k) => [k, process.env[k] ? "✓ set" : "✗ missing"]));
}