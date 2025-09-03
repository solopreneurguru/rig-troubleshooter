import Airtable from "airtable";
import { z } from "zod";

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

// RulePack v2 Zod Schema
export const RulePackV2NodeSchema = z.object({
  key: z.string(),
  type: z.enum(["measure", "inspect", "controls", "hydraulic", "mechanical", "safetyGate", "note", "done"]),
  instruction: z.string(),
  expect: z.number().optional(),
  tolerance: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.union([
    z.literal("VDC"),
    z.literal("VAC"),
    z.literal("mA"),
    z.literal("bar"),
    z.literal("psi"),
    z.literal("ohm"),
    z.literal("deg"),
    z.literal("rpm"),
    z.literal("Hz"),
    z.string()
  ]).optional(),
  points: z.string().optional(),
  multi: z.array(z.object({
    label: z.string(),
    points: z.string().optional(),
    expect: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    unit: z.string().optional()
  })).optional(),
  hazardNote: z.string().optional(),
  requireConfirm: z.boolean().optional(),
  citation: z.string().optional(),
  passNext: z.string().optional(),
  failNext: z.string().optional()
});

export const RulePackV2Schema = z.object({
  key: z.string(),
  version: z.string(),
  start: z.string(),
  nodes: z.record(z.string(), RulePackV2NodeSchema)
});

export type RulePackV2Node = z.infer<typeof RulePackV2NodeSchema>;
export type RulePackV2 = z.infer<typeof RulePackV2Schema>;

// Parse reading from free text
export function parseReading(str: string): { value: number; unit?: string } {
  if (!str || typeof str !== 'string') {
    throw new Error('Invalid input: must be a non-empty string');
  }
  
  // Remove extra whitespace and normalize
  const normalized = str.trim().toUpperCase();
  
  // Common unit patterns
  const unitPatterns = [
    /VDC$/i, /VAC$/i, /MA$/i, /BAR$/i, /PSI$/i, /OHM$/i, /DEG$/i, /RPM$/i, /HZ$/i,
    /V$/i, /A$/i, /W$/i, /KW$/i, /HPA$/i, /KPA$/i, /MPA$/i, /C$/i, /F$/i
  ];
  
  let value: number;
  let unit: string | undefined;
  
  // Try to extract value and unit
  for (const pattern of unitPatterns) {
    const match = normalized.match(new RegExp(`^([\\d.]+)\\s*${pattern.source}`));
    if (match) {
      value = parseFloat(match[1]);
      unit = match[0].slice(match[1].length).trim();
      return { value, unit };
    }
  }
  
  // If no unit found, try to extract just the number
  const numberMatch = normalized.match(/^([\d.]+)/);
  if (numberMatch) {
    value = parseFloat(numberMatch[1]);
    return { value };
  }
  
  throw new Error(`Could not parse reading from: ${str}`);
}

// Helper function to parse RulePack v2
export function parseRulePackV2(raw: any): { ok: boolean; data?: RulePackV2; error?: string } {
  try {
    const validationResult = RulePackV2Schema.safeParse(raw);
    if (!validationResult.success) {
      return { 
        ok: false, 
        error: `Schema validation failed: ${validationResult.error.format()}` 
      };
    }
    return { ok: true, data: validationResult.data };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// Helper function to validate RulePack graph
export async function validateRulePackGraph(rulePack: RulePackV2): Promise<{ warnings: string[] }> {
  const warnings: string[] = [];
  
  // Check if start node exists
  if (!rulePack.nodes[rulePack.start]) {
    throw new Error(`Start node '${rulePack.start}' does not exist`);
  }
  
  // Check all next keys exist
  const nodeKeys = Object.keys(rulePack.nodes);
  for (const [nodeKey, node] of Object.entries(rulePack.nodes)) {
    if (node.passNext && !rulePack.nodes[node.passNext]) {
      throw new Error(`Node '${nodeKey}' references non-existent passNext node '${node.passNext}'`);
    }
    
    if (node.failNext && !rulePack.nodes[node.failNext]) {
      throw new Error(`Node '${nodeKey}' references non-existent failNext node '${node.failNext}'`);
    }
  }
  
  // Check for terminal nodes (nodes that can be reached but have no next)
  const visited = new Set<string>();
  const queue = [rulePack.start];
  
  while (queue.length > 0) {
    const currentKey = queue.shift()!;
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    
    const node = rulePack.nodes[currentKey];
    if (node.type === "done") {
      // Terminal node - no next required
      continue;
    }
    
    if (node.passNext) {
      queue.push(node.passNext);
    }
    if (node.failNext) {
      queue.push(node.failNext);
    }
    
    // Check if non-terminal node has no next
    if (!node.passNext && !node.failNext && (node.type as string) !== "done") {
      warnings.push(`Node '${currentKey}' has no next node and is not terminal`);
    }
  }
  
  // Check for unreachable nodes
  const unreachable = nodeKeys.filter(key => !visited.has(key));
  if (unreachable.length > 0) {
    warnings.push(`Unreachable nodes: ${unreachable.join(', ')}`);
  }
  
  // Check for nodes with both passNext and failNext pointing to same node
  for (const [nodeKey, node] of Object.entries(rulePack.nodes)) {
    if (node.passNext && node.failNext && node.passNext === node.failNext) {
      warnings.push(`Node '${nodeKey}' has same passNext and failNext: '${node.passNext}'`);
    }
  }
  
  return { warnings };
}

// Helper function to simulate RulePack
export async function simulateRulePack(rulePack: RulePackV2, path: Array<{value: number, pass: boolean}>): Promise<{finalNodeKey: string, steps: any[]}> {
  const steps: any[] = [];
  let currentNodeKey: string | null = rulePack.start;
  let pathIndex = 0;
  
  // Walk through the graph
  while (currentNodeKey && pathIndex < path.length) {
    const node: RulePackV2Node = rulePack.nodes[currentNodeKey!];
    if (!node) {
      throw new Error(`Node '${currentNodeKey}' not found`);
    }
    
    const pathEntry = path[pathIndex];
    if (!pathEntry || typeof pathEntry.value !== 'number' || typeof pathEntry.pass !== 'boolean') {
      throw new Error(`Invalid path entry at index ${pathIndex}`);
    }
    
    // Create step
    const step: any = {
      nodeKey: currentNodeKey,
      nodeType: node.type,
      instruction: node.instruction,
      result: "fail" // default
    };
    
    // Add input reading
    try {
      step.input = { value: pathEntry.value, unit: node.unit };
    } catch (e) {
      // If parseReading fails, use raw value
      step.input = { value: pathEntry.value };
    }
    
    // Add expected values if available
    if (node.expect !== undefined) {
      step.expected = { 
        value: node.expect, 
        unit: node.unit,
        tolerance: node.tolerance 
      };
    }
    
    // Add range if available
    if (node.min !== undefined && node.max !== undefined) {
      step.range = { 
        min: node.min, 
        max: node.max, 
        unit: node.unit 
      };
    }
    
    // Determine result based on node type and path entry
    if (node.type === "done") {
      step.result = "done";
      step.nextNode = undefined;
    } else if (node.type === "note") {
      step.result = "note";
      step.nextNode = node.passNext || node.failNext;
    } else {
      // For measure/inspect nodes, use the path entry's pass value
      step.result = pathEntry.pass ? "pass" : "fail";
      step.nextNode = pathEntry.pass ? node.passNext : node.failNext;
    }
    
    steps.push(step);
    
    // Move to next node
    currentNodeKey = step.nextNode || null;
    pathIndex++;
    
    // Safety check to prevent infinite loops
    if (steps.length > 100) {
      throw new Error("Simulation exceeded maximum steps (100)");
    }
  }
  
  // Check if we have remaining path entries
  if (pathIndex < path.length) {
    throw new Error(`Path has ${path.length} entries but simulation completed after ${pathIndex} steps`);
  }
  
  // Check if we have remaining nodes but no path entries
  if (currentNodeKey && pathIndex >= path.length) {
    throw new Error(`Path has ${path.length} entries but simulation needs more steps to reach terminal node`);
  }
  
  const finalNodeKey = steps.length > 0 ? steps[steps.length - 1].nodeKey : rulePack.start;
  
  return { finalNodeKey, steps };
}
