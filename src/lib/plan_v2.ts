// Minimal step engine for v2 RulePacks.
import { getRulePackByKeySafe } from "@/lib/airtable";

export type V2Step =
  | { id: string; type: "info"; text: string; next?: string }
  | { id: string; type: "ask";  text: string; yes?: string; no?: string }
  | { id: string; type: "measure"; text: string; unit?: string;
      okIf?: { op: ">"|">="|"<"|"<="|"=="|"!="; value: number };
      passNext?: string; failNext?: string; }
  | { id: string; type: "safetyGate"; text: string;
      requireConfirm?: boolean; hazardNote?: string; next?: string }
  | { id: string; type: "end";  text?: string };

export type V2Pack = {
  key: string;
  version: 2;
  start: string;
  steps: Record<string, V2Step>;
};

export type V2Action = {
  stepId: string;
  kind: "info"|"ask"|"measure"|"safetyGate";
  value?: any;        // ask: boolean; measure: number/string; safetyGate:{confirmed:boolean}
  ok?: boolean;       // measure only
  confirmedById?: string; // optional
  confirmedAt?: string;   // optional ISO
};

export function isV2Pack(p: any): p is V2Pack {
  return p && p.version === 2 && typeof p.start === "string" && p.steps && typeof p.steps === "object";
}

// Compute next step id from a history of actions.
// If no actions: return start. If last action branches (ask/measure), follow branch.
export function nextStepId(pack: V2Pack, actions: V2Action[]): string | null {
  if (!actions || actions.length === 0) return pack.start;

  const last = actions[actions.length - 1];
  const step = pack.steps[last.stepId];
  if (!step) return pack.start;

  if (step.type === "ask") {
    const goYes = step.yes ?? null;
    const goNo  = step.no  ?? null;
    if (last.value === true && goYes) return goYes;
    if (last.value === false && goNo) return goNo;
    return goNo ?? goYes ?? null;
  }

  if (step.type === "measure") {
    // Branch on ok result if configured
    const m = step;
    if (typeof last.ok === "boolean") {
      if (last.ok && m.passNext) return m.passNext;
      if (!last.ok && m.failNext) return m.failNext;
    }
    // Fallback to passNext or next-like behavior
    return m.passNext ?? m.failNext ?? null;
  }

  if (step.type === "safetyGate") {
    // Advance only if confirmed
    const confirmed = !!(last?.value?.confirmed || last?.value === true);
    return confirmed ? (step.next ?? null) : step.id; // stay put if not confirmed
  }

  if (step.type === "info") {
    return step.next ?? null;
  }

  return null; // end
}

export function evaluateMeasure(step: Extract<V2Step, {type:"measure"}>, value: number): boolean | undefined {
  const cond = step.okIf;
  if (!cond) return undefined;
  const v = Number(value);
  switch (cond.op) {
    case ">":  return v >  cond.value;
    case ">=": return v >= cond.value;
    case "<":  return v <  cond.value;
    case "<=": return v <= cond.value;
    case "==": return v == cond.value;
    case "!=": return v != cond.value;
  }
}

export async function loadV2PackByKey(packKey: string): Promise<V2Pack | null> {
  const rec = await getRulePackByKeySafe(packKey);
  const jsonStr = rec?.Json;
  if (!jsonStr) return null;
  try {
    const parsed = JSON.parse(jsonStr);
    if (isV2Pack(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}
