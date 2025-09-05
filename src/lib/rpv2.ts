export type V2NodeType = "measure" | "inspect" | "mechanical" | "hydraulic" | "controls" | "safetyGate" | "note" | "done";

export interface V2Node {
  type: V2NodeType;
  subtype?: "collectDocs" | "codeCheck";
  instruction: string;
  expect?: number;
  tolerance?: number;
  min?: number;
  max?: number;
  unit?: string;
  citation?: string;
  requireConfirm?: boolean;
  hazardNote?: string;
  passNext?: string;
  failNext?: string;
}

export interface RulePackV2 {
  key: string;
  version: 2;
  equipmentType: string;
  start: string;
  nodes: Record<string, V2Node>;
}

export function nodePassFail(node: V2Node, value?: number, pass?: boolean) {
  if (node.type !== "measure") return pass === true;
  
  // measure with expect/tol or min/max
  if (typeof node.expect === "number" && typeof node.tolerance === "number" && typeof value === "number") {
    return Math.abs(value - node.expect) <= node.tolerance;
  }
  
  if (typeof node.min === "number" && typeof value === "number") {
    if (typeof node.max === "number") return value >= node.min && value <= node.max;
    return value >= node.min;
  }
  
  // if no numeric criteria provided, rely on pass boolean
  return pass === true;
}
