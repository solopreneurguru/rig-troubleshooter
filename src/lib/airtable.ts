import Airtable from "airtable";

const apiKey = process.env.AIRTABLE_API_KEY?.trim();
const baseId = process.env.AIRTABLE_BASE_ID;

const rigsTableId = process.env.TB_RIGS;
const docsTableId = process.env.TB_DOCS;
const sessionsTableId = process.env.TB_SESSIONS;
const actionsTableId = process.env.TB_ACTIONS;
const readingsTableId = process.env.TB_READINGS;
const findingsTableId = process.env.TB_FINDINGS;

if (!apiKey || !baseId) {
  console.warn("[airtable] Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
}

const base = apiKey && baseId ? new Airtable({ apiKey }).base(baseId) : null;

const linkIds = (id?: string) => (id ? [id] : undefined);

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

export async function getRigById(id: string) {
  const rec = await table(rigsTableId).find(id);
  return { id: rec.id, ...(rec.fields as any) };
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
  if (fields.RigId) payload.Rig = linkIds(fields.RigId);
  if (fields.SessionId) payload.Session = linkIds(fields.SessionId);
  const recs = await tbl.create([{ fields: payload }]);
  return { id: recs[0].id, fields: recs[0].fields as any };
}

// ---------- Sessions / Actions / Readings ----------
export async function createSession(title: string, problem?: string, rigId?: string) {
  const tbl = table(sessionsTableId);
  const fields: any = { Title: title || `Session ${Date.now()}`, Status: "Open" };
  if (rigId) fields.Rig = linkIds(rigId);
  
  // Try to create with Problem field first, fallback without it if field doesn't exist
  if (problem) {
    try {
      fields.Problem = problem;
      const recs = await tbl.create([{ fields }]);
      return recs[0].id;
    } catch (e: any) {
      if (e?.message?.includes("Unknown field name") && e?.message?.includes("Problem")) {
        console.warn("Problem field doesn't exist in Sessions table, creating without it");
        delete fields.Problem;
        const recs = await tbl.create([{ fields }]);
        return recs[0].id;
      }
      throw e; // Re-throw if it's a different error
    }
  } else {
    const recs = await tbl.create([{ fields }]);
    return recs[0].id;
  }
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
    Session: linkIds(sessionId),
    StepKey: step.key,
    Instruction: step.instruction,
    Expected: step.expect || "",
    Citation: step.citation || "",
    Order: order,
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
  const fields: any = { Action: linkIds(actionId), Value: value };
  if (unit) fields.Unit = unit;
  if (passFail) fields.PassFail = passFail;
  const recs = await tbl.create([{ fields }]);
  return recs[0].id;
}

// Bundle session data for reports
export async function getSessionBundle(sessionId: string) {
  const sRec = await table(sessionsTableId).find(sessionId);
  const session = { id: sRec.id, ...(sRec.fields as any) };

  const aRecs = await table(actionsTableId)
    .select({ maxRecords: 500, sort: [{ field: "Order", direction: "asc" }] })
    .firstPage();
  const actions = aRecs.filter((r) => {
    const links = (r.fields as any).Session as string[] | undefined;
    return Array.isArray(links) && links.includes(sessionId);
  });

  const rRecs = await table(readingsTableId).select({ maxRecords: 1000 }).firstPage();
  const readingsByAction: Record<string, any[]> = {};
  for (const rd of rRecs) {
    const links = (rd.fields as any).Action as string[] | undefined;
    const aId = Array.isArray(links) ? links[0] : undefined;
    if (aId) (readingsByAction[aId] ||= []).push(rd.fields);
  }

  const actionsFull = actions.map((a) => ({ id: a.id, ...(a.fields as any), readings: readingsByAction[a.id] || [] }));

  let rig: any = null;
  const rigLink = (sRec.fields as any).Rig as string[] | undefined;
  const rigId = Array.isArray(rigLink) ? rigLink[0] : undefined;
  if (rigId) {
    try { const rr = await table(rigsTableId).find(rigId); rig = { id: rr.id, ...(rr.fields as any) }; } catch {}
  }

  return { session, rig, actions: actionsFull };
}

// ---------- Findings ----------
type CreateFindingInput = {
  Title: string; SessionId: string; RigId?: string;
  Outcome?: string; Summary?: string; Parts?: string; ReportURL?: string;
};
export async function createFinding(fields: CreateFindingInput) {
  const tbl = table(findingsTableId);
  const payload: any = { Title: fields.Title, Session: linkIds(fields.SessionId)! };
  if (fields.RigId) payload.Rig = linkIds(fields.RigId);
  if (fields.Outcome) payload.Outcome = fields.Outcome;
  if (fields.Summary) payload.Summary = fields.Summary;
  if (fields.Parts) payload.Parts = fields.Parts;
  if (fields.ReportURL) payload.ReportURL = fields.ReportURL;
  const recs = await tbl.create([{ fields: payload }]);
  return recs[0].id;
}
export async function updateFinding(id: string, fields: Partial<{ ReportURL: string }>) {
  const tbl = table(findingsTableId);
  await tbl.update([{ id, fields: fields as any }]);
}

export function envStatus() {
  const keys = [
    "AIRTABLE_API_KEY","AIRTABLE_BASE_ID","TB_RIGS","TB_EQUIP_TYPES","TB_RIG_EQUIP",
    "TB_DOCS","TB_SESSIONS","TB_ACTIONS","TB_READINGS","TB_FINDINGS","TB_TECHS","BLOB_READ_WRITE_TOKEN",
  ] as const;
  return Object.fromEntries(keys.map((k) => [k, process.env[k] ? "✓ set" : "✗ missing"]));
}