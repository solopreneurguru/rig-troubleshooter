import Airtable from "airtable";

const apiKey = process.env.AIRTABLE_API_KEY?.trim();
const baseId = process.env.AIRTABLE_BASE_ID;

const rigsTableId = process.env.TB_RIGS;
const docsTableId = process.env.TB_DOCS;
const sessionsTableId = process.env.TB_SESSIONS;
const actionsTableId = process.env.TB_ACTIONS;
const readingsTableId = process.env.TB_READINGS;
const findingsTableId = process.env.TB_FINDINGS;
const techsTableId = process.env.TB_TECHS;

// Result mapping configuration
const RESULT_PASS = (process.env.AT_RESULT_PASS_OPTION || "Pass").trim();
const RESULT_FAIL = (process.env.AT_RESULT_FAIL_OPTION || "Fail").trim();
const READING_PASS = (process.env.AT_READING_PASS_OPTION || RESULT_PASS).trim();
const READING_FAIL = (process.env.AT_READING_FAIL_OPTION || RESULT_FAIL).trim();

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
export async function getSessionById(id: string) {
  const rec = await table(sessionsTableId).find(id);
  return { id: rec.id, ...(rec.fields as any) };
}

export async function createSession(title: string, problem?: string, rigId?: string, rulePackKey?: string) {
  const tbl = table(sessionsTableId);
  const problemField = (process.env.SESSIONS_PROBLEM_FIELD || "Problem").trim();
  const rpField = (process.env.SESSIONS_RULEPACK_FIELD || "RulePackKey").trim();
  const baseFields: any = { Title: title || `Session ${Date.now()}`, Status: "Open" };
  if (rigId) baseFields.Rig = linkIds(rigId);
  const tryCreate = async (withProblem: boolean) => {
    const fields: any = { ...baseFields };
    if (withProblem && problem) fields[problemField] = problem;
    if (rulePackKey) fields[rpField] = rulePackKey;
    const recs = await tbl.create([{ fields }]);
    return recs[0].id;
  };
  try { return await tryCreate(true); }
  catch (e:any) {
    if (/Unknown field name/i.test(String(e?.message||e))) return await tryCreate(false);
    throw e;
  }
}

export type Step = {
  key: string;
  instruction: string;
  expect?: string;
  citation?: string;
  unit?: string;
  hazardNote?: string;
  requireConfirm?: boolean;
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
  const val = result === "pass" ? RESULT_PASS : RESULT_FAIL;
  await tbl.update([{ id: actionId, fields: { Result: val } as any }]);
}

// ---------- Techs ----------
export async function createOrGetTechByEmail(name: string, email: string) {
  if (!techsTableId) throw new Error("Techs table not configured");
  const tbl = table(techsTableId);
  
  // Try to find existing tech by email
  const records = await tbl.select({ 
    filterByFormula: `{Email} = '${email}'`,
    maxRecords: 1 
  }).firstPage();
  
  if (records.length > 0) {
    const tech = records[0];
    return { id: tech.id, ...(tech.fields as any) };
  }
  
  // Create new tech
  const recs = await tbl.create([{ 
    fields: { Name: name, Email: email } as any 
  }]);
  return { id: recs[0].id, ...(recs[0].fields as any) };
}

export async function getTechById(id: string) {
  if (!techsTableId) throw new Error("Techs table not configured");
  const rec = await table(techsTableId).find(id);
  return { id: rec.id, ...(rec.fields as any) };
}

export async function updateActionHazardConfirm(actionId: string, data: {
  confirmedById: string;
  confirmedAt: string;
  hazardNote?: string;
}) {
  const tbl = table(actionsTableId);
  const fields: any = {
    ConfirmedBy: data.confirmedById,
    ConfirmedAt: data.confirmedAt,
  };
  if (data.hazardNote) fields.HazardNote = data.hazardNote;
  await tbl.update([{ id: actionId, fields }]);
}

export async function createReading(actionId: string, value: string, unit?: string, passFail?: "pass"|"fail") {
  const tbl = table(readingsTableId);
  const fields: any = { Action: linkIds(actionId), Value: value };
  if (unit) fields.Unit = unit;
  if (passFail) fields.PassFail = passFail === "pass" ? READING_PASS : READING_FAIL;
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
    "TB_DOCS","TB_SESSIONS","TB_ACTIONS","TB_READINGS","TB_FINDINGS","TB_TECHS","TB_RULEPACKS",
    "SESSIONS_RULEPACK_FIELD","BLOB_READ_WRITE_TOKEN",
  ] as const;
  return Object.fromEntries(keys.map((k) => [k, process.env[k] ? "✓ set" : "✗ missing"]));
}