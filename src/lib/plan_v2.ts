// Minimal step engine for v2 RulePacks.
import { getRulePackByKeySafe } from "@/lib/airtable";
import type { V2Step } from "@/types/steps";

// Legacy step types for backward compatibility
export type LegacyV2Step =
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
  steps: Record<string, V2Step | LegacyV2Step>;
};

export type V2Action = {
  stepId: string;
  kind: "info"|"ask"|"measure"|"safetyGate"|"plc_read"|"photo";
  value?: any;        // ask: boolean; measure: number/string; safetyGate:{confirmed:boolean}; plc_read: number|string|boolean; photo: string
  ok?: boolean;       // measure/plc_read only
  confirmedById?: string; // optional
  confirmedAt?: string;   // optional ISO
  citations?: any[];  // citations acknowledged
  plcResult?: number | string | boolean; // plc_read result
  photoUrl?: string;  // photo upload URL
};

export function isV2Pack(p: any): p is V2Pack {
  return p && p.version === 2 && typeof p.start === "string" && p.steps && typeof p.steps === "object";
}

// Compute next step id from a history of actions.
// If no actions: return start. If last action branches (ask/measure/plc_read), follow branch.
export function nextStepId(pack: V2Pack, actions: V2Action[]): string | null {
  if (!actions || actions.length === 0) return pack.start;

  const last = actions[actions.length - 1];
  const step = pack.steps[last.stepId];
  if (!step) return pack.start;

  // Handle new step kinds (V2Step)
  if ('kind' in step) {
    if (step.kind === "ask") {
      const goYes = (step as any).yes ?? null;
      const goNo  = (step as any).no  ?? null;
      if (last.value === true && goYes) return goYes;
      if (last.value === false && goNo) return goNo;
      return goNo ?? goYes ?? null;
    }

    if (step.kind === "measure") {
      const m = step as any;
      if (typeof last.ok === "boolean") {
        if (last.ok && m.passNext) return m.passNext;
        if (!last.ok && m.failNext) return m.failNext;
      }
      return m.passNext ?? m.failNext ?? null;
    }

    if (step.kind === "plc_read") {
      const plcStep = step as any;
      if (typeof last.ok === "boolean") {
        if (last.ok && plcStep.nextOn?.pass) return plcStep.nextOn.pass;
        if (!last.ok && plcStep.nextOn?.fail) return plcStep.nextOn.fail;
      }
      return plcStep.nextOn?.pass ?? plcStep.nextOn?.fail ?? null;
    }

    if (step.kind === "photo") {
      return (step as any).next ?? null;
    }

    if (step.kind === "info") {
      return (step as any).next ?? null;
    }

    if (step.kind === "end") {
      return null;
    }
  }

  // Handle legacy step types (LegacyV2Step)
  if ('type' in step) {
    if (step.type === "ask") {
      const goYes = (step as any).yes ?? null;
      const goNo  = (step as any).no  ?? null;
      if (last.value === true && goYes) return goYes;
      if (last.value === false && goNo) return goNo;
      return goNo ?? goYes ?? null;
    }

    if (step.type === "measure") {
      // Branch on ok result if configured
      const m = step as any;
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
      return confirmed ? ((step as any).next ?? null) : step.id; // stay put if not confirmed
    }

    if (step.type === "info") {
      return (step as any).next ?? null;
    }
  }

  return null; // end
}

export function evaluateMeasure(step: Extract<LegacyV2Step, {type:"measure"}>, value: number): boolean | undefined {
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

export function evaluatePlcRead(step: any, value: number | string | boolean): boolean | undefined {
  const cond = step.expect;
  if (!cond) return undefined;
  
  switch (cond.op) {
    case "==": return value == cond.value;
    case "!=": return value != cond.value;
    case ">":  return Number(value) > Number(cond.value);
    case ">=": return Number(value) >= Number(cond.value);
    case "<":  return Number(value) < Number(cond.value);
    case "<=": return Number(value) <= Number(cond.value);
    case "in": return Array.isArray(cond.value) && cond.value.includes(value);
    default: return undefined;
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
