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

// New table IDs
const equipmentTypesTableId = process.env.TB_EQUIPMENT_TYPES;
const equipmentInstancesTableId = process.env.TB_EQUIPMENT_INSTANCES;
const componentsTableId = process.env.TB_COMPONENTS;
const signalsTableId = process.env.TB_SIGNALS;
const testPointsTableId = process.env.TB_TESTPOINTS;
const partsTableId = process.env.TB_PARTS;

// Result mapping configuration
const RESULT_PASS = (process.env.AT_RESULT_PASS_OPTION || "Pass").trim();
const RESULT_FAIL = (process.env.AT_RESULT_FAIL_OPTION || "Fail").trim();
const READING_PASS = (process.env.AT_READING_PASS_OPTION || RESULT_PASS).trim();
const READING_FAIL = (process.env.AT_READING_FAIL_OPTION || RESULT_FAIL).trim();

// Field name configuration
const SESS_EQUIP_FIELD = process.env.SESSIONS_EQUIPMENT_FIELD || "EquipmentInstance";
const EQI_TYPE_FIELD = process.env.EQUIPINSTANCES_TYPE_FIELD || "Type";

if (!apiKey || !baseId) {
  console.warn("[airtable] Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
}

const base = apiKey && baseId ? new Airtable({ apiKey }).base(baseId) : null;

const linkIds = (id?: string) => (id ? [id] : undefined);

// Blocked fields that should never be written to Airtable (Formula/Computed or system-managed)
export const BLOCKED_FIELDS = new Set(["Title","CreatedAt","Attachments"]);

export function sanitizeFields<T extends Record<string, any>>(fields: T) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (v === undefined || v === null) continue;
    if (BLOCKED_FIELDS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

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

export async function createSession(
  title: string, 
  problem?: string, 
  rigId?: string, 
  rulePackKey?: string,
  equipmentInstanceId?: string,
  failureMode?: string
) {
  const tbl = table(sessionsTableId);
  const problemField = (process.env.SESSIONS_PROBLEM_FIELD || "Problem").trim();
  const rpField = (process.env.SESSIONS_RULEPACK_FIELD || "RulePackKey").trim();
  
  // Build explicit whitelist object and sanitize
  const fields = sanitizeFields({
    Rig: rigId ? [rigId] : undefined,
    [SESS_EQUIP_FIELD]: equipmentInstanceId ? [equipmentInstanceId] : undefined,
    Problem: problem || undefined,
    Status: "Open",
    FailureMode: failureMode || undefined,
    RulePackKey: rulePackKey || undefined,
    // DO NOT include Title - it's computed by Airtable formula
  });
  
  const tryCreate = async (withProblem: boolean) => {
    const fieldsToSend = { ...fields };
    if (!withProblem && problem) {
      delete fieldsToSend.Problem;
    }
    
    const recs = await tbl.create([{ fields: fieldsToSend }]);
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

export const FINDING_OUTCOMES = [
  'Resolved','Escalate-Electrical','Escalate-Controls','Escalate-Mechanical','Unresolved','Needs Parts','Needs Vendor'
] as const;

// ---------- TypeScript Interfaces ----------
export interface EquipmentType {
  id: string;
  Name: string;
  Description?: string;
  Category?: string;
}

export interface EquipmentInstance {
  id: string;
  Name: string;
  SerialNumber?: string;
  EquipmentType?: string[];
  Rig?: string[];
  PLCProjectDoc?: string;
  Status?: string;
  Notes?: string;
}

export interface Signal {
  id: string;
  Tag: string;
  Address?: string;
  Unit?: string;
  Description?: string;
  EquipmentInstance?: string[];
  Type?: string;
}

export interface TestPoint {
  id: string;
  Label: string;
  Reference?: string;
  Nominal?: number;
  Unit?: string;
  DocRef?: string;
  DocPage?: number;
  EquipmentInstance?: string[];
}

export interface Part {
  id: string;
  Name: string;
  PartNumber?: string;
  Description?: string;
  Category?: string;
  Supplier?: string;
}

export interface Component {
  id: string;
  Name: string;
  Type?: string;
  EquipmentInstance?: string[];
  Status?: string;
  Notes?: string;
}

export interface Session {
  id: string;
  Title: string;
  Problem?: string;
  FailureMode?: string;
  RulePackKey?: string;
  Status?: string;
  Rig?: string[];
  EquipmentInstance?: string[];
  CreatedAt?: string;
}

export interface Action {
  id: string;
  Session?: string[];
  StepKey: string;
  Instruction: string;
  Expected?: string;
  Citation?: string;
  Order: number;
  Result?: string;
  ConfirmedBy?: string;
  ConfirmedAt?: string;
  HazardNote?: string;
}

export interface Reading {
  id: string;
  Action?: string[];
  Value: string;
  Unit?: string;
  PassFail?: string;
  Timestamp?: string;
}

export interface Finding {
  id: string;
  Title: string;
  Session?: string[];
  Rig?: string[];
  Outcome?: string;
  Summary?: string;
  Parts?: string;
  ReportURL?: string;
}

export interface Tech {
  id: string;
  Name: string;
  Email: string;
  Role?: string;
}

// ---------- Equipment Types ----------
export async function listEquipmentTypes(limit = 50): Promise<EquipmentType[]> {
  if (!equipmentTypesTableId) throw new Error("Equipment Types table not configured");
  const tbl = table(equipmentTypesTableId);
  const records = await tbl.select({ maxRecords: limit }).firstPage();
  return records.map((r) => ({ id: r.id, ...(r.fields as any) }));
}

export async function getEquipmentTypeById(id: string): Promise<EquipmentType> {
  if (!equipmentTypesTableId) throw new Error("Equipment Types table not configured");
  const rec = await table(equipmentTypesTableId).find(id);
  return { id: rec.id, ...(rec.fields as any) };
}

// ---------- Equipment Instances ----------
export async function listEquipmentInstances(limit = 50): Promise<EquipmentInstance[]> {
  if (!equipmentInstancesTableId) throw new Error("Equipment Instances table not configured");
  const tbl = table(equipmentInstancesTableId);
  const records = await tbl.select({ maxRecords: limit }).firstPage();
  return records.map((r) => ({ id: r.id, ...(r.fields as any) }));
}

export async function getEquipmentInstanceById(id: string): Promise<EquipmentInstance> {
  if (!equipmentInstancesTableId) throw new Error("Equipment Instances table not configured");
  const rec = await table(equipmentInstancesTableId).find(id);
  return { id: rec.id, ...(rec.fields as any) };
}

export async function createEquipmentInstance(fields: {
  name?: string;
  rigId?: string;
  typeId?: string;
  serial?: string;
  variantNotes?: string;
  plcDocId?: string;           // optional link to a Documents row
  commissionedAt?: string;     // ISO date
}): Promise<string> {
  if (!equipmentInstancesTableId) throw new Error("Equipment Instances table not configured");
  const tbl = table(equipmentInstancesTableId);
  const payload = sanitizeFields({
    Name: fields.name ?? undefined,
    Rig: fields.rigId ? [fields.rigId] : undefined,
    [EQI_TYPE_FIELD]: fields.typeId ? [fields.typeId] : undefined,
    Serial: fields.serial ?? undefined,
    VariantNotes: fields.variantNotes ?? undefined,
    PLCProject: fields.plcDocId ? [fields.plcDocId] : undefined,
    CommissionedAt: fields.commissionedAt ?? undefined,
    // DO NOT include Status here
  });
  const recs = await tbl.create([{ fields: payload }]);
  return recs[0].id;
}

// New helper function with env-driven field names as requested
export async function createEquipmentInstanceV2(fields: {
  name: string;
  typeId?: string;
  rigId?: string;
  serial?: string;
  plcDocId?: string;
  variantNotes?: string;
  commissionedAt?: string;
}): Promise<string> {
  if (!equipmentInstancesTableId) throw new Error("Equipment Instances table not configured");
  const tbl = table(equipmentInstancesTableId);
  const fieldsToSend = sanitizeFields({
    Name: fields.name,
    [EQI_TYPE_FIELD]: fields.typeId ? [fields.typeId] : undefined,
    Rig: fields.rigId ? [fields.rigId] : undefined,
    Serial: fields.serial || undefined,
    PLCProject: fields.plcDocId ? [fields.plcDocId] : undefined,
    VariantNotes: fields.variantNotes || undefined,
    CommissionedAt: fields.commissionedAt || undefined,
  });
  const recs = await tbl.create([{ fields: fieldsToSend }]);
  return recs[0].id;
}

// ---------- Signals ----------
export async function listSignals(limit = 50): Promise<Signal[]> {
  if (!signalsTableId) throw new Error("Signals table not configured");
  const tbl = table(signalsTableId);
  const records = await tbl.select({ maxRecords: limit }).firstPage();
  return records.map((r) => ({ id: r.id, ...(r.fields as any) }));
}

export async function getSignalsByEquipmentInstance(equipmentInstanceId: string): Promise<Signal[]> {
  if (!signalsTableId) throw new Error("Signals table not configured");
  const tbl = table(signalsTableId);
  const records = await tbl.select({
    filterByFormula: `FIND('${equipmentInstanceId}', ARRAYJOIN({EquipmentInstance}))`,
    maxRecords: 100
  }).firstPage();
  return records.map((r) => ({ id: r.id, ...(r.fields as any) }));
}

// ---------- Test Points ----------
export async function listTestPoints(limit = 50): Promise<TestPoint[]> {
  if (!testPointsTableId) throw new Error("Test Points table not configured");
  const tbl = table(testPointsTableId);
  const records = await tbl.select({ maxRecords: limit }).firstPage();
  return records.map((r) => ({ id: r.id, ...(r.fields as any) }));
}

export async function getTestPointsByEquipmentInstance(equipmentInstanceId: string): Promise<TestPoint[]> {
  if (!testPointsTableId) throw new Error("Test Points table not configured");
  const tbl = table(testPointsTableId);
  const records = await tbl.select({
    filterByFormula: `FIND('${equipmentInstanceId}', ARRAYJOIN({EquipmentInstance}))`,
    maxRecords: 100
  }).firstPage();
  return records.map((r) => ({ id: r.id, ...(r.fields as any) }));
}

// ---------- Parts ----------
export async function listParts(limit = 50): Promise<Part[]> {
  if (!partsTableId) throw new Error("Parts table not configured");
  const tbl = table(partsTableId);
  const records = await tbl.select({ maxRecords: limit }).firstPage();
  return records.map((r) => ({ id: r.id, ...(r.fields as any) }));
}

// ---------- Components ----------
export async function listComponents(limit = 50): Promise<Component[]> {
  if (!componentsTableId) throw new Error("Components table not configured");
  const tbl = table(componentsTableId);
  const records = await tbl.select({ maxRecords: limit }).firstPage();
  return records.map((r) => ({ id: r.id, ...(r.fields as any) }));
}

// ---------- Recent Findings ----------
export async function getRecentFindingsByEquipmentTypeAndFailureMode(
  equipmentType: string, 
  failureMode: string, 
  limit = 3
): Promise<Finding[]> {
  if (!findingsTableId) throw new Error("Findings table not configured");
  const tbl = table(findingsTableId);
  const records = await tbl.select({
    filterByFormula: `AND({EquipmentType} = '${equipmentType}', {FailureMode} = '${failureMode}')`,
    maxRecords: limit,
    sort: [{ field: "CreatedAt", direction: "desc" }]
  }).firstPage();
  return records.map((r) => ({ id: r.id, ...(r.fields as any) }));
}

export function envStatus() {
  const keys = [
    "AIRTABLE_API_KEY","AIRTABLE_BASE_ID","TB_RIGS","TB_EQUIP_TYPES","TB_RIG_EQUIP",
    "TB_DOCS","TB_SESSIONS","TB_ACTIONS","TB_READINGS","TB_FINDINGS","TB_TECHS","TB_RULEPACKS",
    "TB_EQUIPMENT_TYPES","TB_EQUIPMENT_INSTANCES","TB_COMPONENTS","TB_SIGNALS","TB_TESTPOINTS","TB_PARTS",
    "SESSIONS_RULEPACK_FIELD","SESSIONS_EQUIPMENT_FIELD","EQUIPINSTANCES_TYPE_FIELD","BLOB_READ_WRITE_TOKEN",
  ] as const;
  return Object.fromEntries(keys.map((k) => [k, process.env[k] ? "✓ set" : "✗ missing"]));
}

// ---------- New Functions for Symptom Router and Right-Rail Data ----------
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const API_KEY = process.env.AIRTABLE_API_KEY!;
const TB = {
  SESSIONS: process.env.TB_SESSIONS!,
  FINDINGS: process.env.TB_FINDINGS!,
  EQUIPMENT_INSTANCES: process.env.TB_EQUIPMENT_INSTANCES!,
  SIGNALS: process.env.TB_SIGNALS!,
  TESTPOINTS: process.env.TB_TESTPOINTS!,
};

async function airGet(tableId: string, params: Record<string,string>) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${tableId}?${q}`, {
    headers: { Authorization: `Bearer ${API_KEY}` }
  });
  if (!r.ok) throw new Error(`GET ${tableId} ${r.status}`);
  return r.json();
}

async function airPatch(tableId: string, records: any[]) {
  const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type":"application/json" },
    body: JSON.stringify({ records })
  });
  if (!r.ok) throw new Error(`PATCH ${tableId} ${r.status}`);
  return r.json();
}

export async function setSessionFields(sessionId: string, fields: any) {
  // Sanitize fields to block Formula/Computed or system-managed fields
  const safe = sanitizeFields(fields);
  return airPatch(TB.SESSIONS, [{ id: sessionId, fields: safe }]);
}

export async function getSignalsByEquipment(equipId: string) {
  return airGet(TB.SIGNALS, {
    filterByFormula: `FIND("${equipId}", ARRAYJOIN({Equipment}))`,
    maxRecords: "50"
  });
}

export async function getTestPointsByEquipment(equipId: string) {
  return airGet(TB.TESTPOINTS, {
    filterByFormula: `FIND("${equipId}", ARRAYJOIN({Equipment}))`,
    maxRecords: "50"
  });
}

export async function getSimilarFindings(failureMode: string) {
  return airGet(TB.FINDINGS, {
    filterByFormula: `{FailureMode} = '${failureMode}'`,
    maxRecords: "3",
    sort: '[{ "field": "Created time", "direction": "desc" }]' // if available
  });
}

// Helper function to verify select options in development
export function assertSelectOptions() {
  if (process.env.NODE_ENV !== 'development') return;
  
  const actionResults = ['Pending', 'Pass', 'Fail'];
  const findingOutcomes = ['Resolved', 'Escalate Mechanical', 'Escalate Electrical', 'Escalate Controls', 'Monitor'];
  
  console.log('Select Options Verification:');
  console.log('Actions.Result:', actionResults);
  console.log('Findings.Outcome:', findingOutcomes);
}

// ---------- RulePack v2 Helpers ----------
const rulePacksTableId = process.env.TB_RULEPACKS;

export async function getRulePackByKey(key: string) {
  if (!rulePacksTableId) throw new Error("RulePacks table not configured");
  const tbl = table(rulePacksTableId);
  const records = await tbl.select({
    filterByFormula: `{Key} = '${key}'`,
    maxRecords: 1
  }).firstPage();
  
  if (records.length === 0) return null;
  
  const record = records[0];
  const jsonField = (record.fields as any).Json;
  if (!jsonField) return null;
  
  try {
    return JSON.parse(jsonField);
  } catch (e) {
    console.error("Failed to parse RulePack JSON:", e);
    return null;
  }
}

export async function getLastActionForSession(sessionId: string) {
  const tbl = table(actionsTableId);
  const records = await tbl.select({
    filterByFormula: `FIND('${sessionId}', ARRAYJOIN({Session}))`,
    maxRecords: 1,
    sort: [{ field: "CreatedTime", direction: "desc" }]
  }).firstPage();
  
  return records.length > 0 ? records[0] : null;
}

export async function createActionAndReading(opts: {
  sessionId: string; 
  stepKey: string; 
  instruction: string; 
  expected: string; 
  citation: string;
  unit?: string; 
  value?: number; 
  passFail: "Pass" | "Fail"; 
  confirm?: { techId: string | null } | null;
}) {
  const actionTbl = table(actionsTableId);
  const readingTbl = table(readingsTableId);
  
  // Create Action record
  const actionFields: any = {
    Session: linkIds(opts.sessionId),
    StepKey: opts.stepKey,
    Instruction: opts.instruction,
    Expected: opts.expected,
    Citation: opts.citation,
    Result: opts.passFail,
    Order: Date.now() // Use timestamp as order for now
  };
  
  if (opts.confirm) {
    actionFields.ConfirmedBy = opts.confirm.techId ? linkIds(opts.confirm.techId) : undefined;
    actionFields.ConfirmedAt = new Date().toISOString();
  }
  
  const actionRecs = await actionTbl.create([{ fields: actionFields }]);
  const actionId = actionRecs[0].id;
  
  // Create Reading record
  const readingFields: any = {
    Action: linkIds(actionId),
    Value: opts.value?.toString() || "",
    PassFail: opts.passFail
  };
  
  if (opts.unit) readingFields.Unit = opts.unit;
  
  const readingRecs = await readingTbl.create([{ fields: readingFields }]);
  const readingId = readingRecs[0].id;
  
  return { actionId, readingId };
}

export async function setActionResult(actionId: string, result: "Pass" | "Fail") {
  const tbl = table(actionsTableId);
  await tbl.update([{ id: actionId, fields: { Result: result } as any }]);
}