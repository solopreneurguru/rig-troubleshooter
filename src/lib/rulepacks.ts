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
const table = (id?: string) => { if (!base || !id) throw new Error("RulePacks table not configured"); return base(id); };

export async function listRulePacks() {
  try {
    const recs = await table(rpTableId).select({ filterByFormula: "Active", maxRecords: 200 }).firstPage();
    return recs.map(r => ({ id: r.id, ...(r.fields as any) }));
  } catch (error) {
    console.error("Error listing rule packs:", error);
    return [];
  }
}

export async function getRulePackByKey(key: string): Promise<RulePack | null> {
  try {
    const recs = await table(rpTableId).select({ maxRecords: 50 }).firstPage();
    const match = recs.find(r => (r.fields as any).Key === key && (r.fields as any).Active);
    if (!match) return null;
    const f = match.fields as any;
    const raw = typeof f.Json === "string" ? f.Json : JSON.stringify(f.Json || {});
    const pack = JSON.parse(raw || "{}");
    const start = pack.start || Object.keys(pack.nodes || {})[0];
    return { id: match.id, key: f.Key, equipmentType: f.EquipmentType, model: f.Model, plcVersion: f.PLCVersion, start, nodes: pack.nodes || {} };
  } catch (error) {
    console.error("Error getting rule pack by key:", error);
    return null;
  }
}
