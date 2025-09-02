import Airtable from "airtable";

export type RPNode = {
  key: string;
  type?: "measure"|"inspect"|"command"|"controls"|"hydraulic"|"mechanical"|"safetyGate";
  instruction: string;
  unit?: string;
  points?: string;
  expect?: number;          // exact value
  tolerance?: number;       // +/- around expect
  min?: number;             // range lower
  max?: number;             // range upper
  citation?: string;
  requireConfirm?: boolean;
  hazardNote?: string;
  passNext?: string;
  failNext?: string;
};

export type RulePack = {
  id: string;
  key: string;
  equipmentType?: string;
  model?: string;
  plcVersion?: string;
  start?: string;
  nodes: Record<string, RPNode>;
};
const apiKey = process.env.AIRTABLE_API_KEY?.trim();
const baseId = process.env.AIRTABLE_BASE_ID;
const rpTableId = process.env.TB_RULEPACKS;

const base = apiKey && baseId ? new Airtable({ apiKey }).base(baseId) : null;
const table = (id?: string) => {
  if (!base) throw new Error("RulePacks: Airtable base not configured");
  if (!id) throw new Error("RulePacks: TB_RULEPACKS not set");
  return base(id);
};

export async function listRulePacks() {
  const tbl = table(rpTableId);
  // Checkbox filter must be wrapped in {}
  const recs = await tbl.select({ filterByFormula: "{Active}", maxRecords: 200 }).firstPage();
  return recs.map(r => ({ id: r.id, ...(r.fields as any) }));
}

export async function getRulePackByKey(key: string) {
  const packs = await listRulePacks();
  const match = packs.find((p:any) => p.Key === key);
  if (!match) return null;
  const f = match as any;
  const raw = typeof f.Json === "string" ? f.Json : JSON.stringify(f.Json || {});
  let parsed:any = {};
  try { parsed = JSON.parse(raw || "{}"); } catch { parsed = {}; }
  const start = parsed.start || Object.keys(parsed.nodes || {})[0];
  return { id: match.id, key: f.Key, equipmentType: f.EquipmentType, model: f.Model, plcVersion: f.PLCVersion, start, nodes: parsed.nodes || {} };
}
