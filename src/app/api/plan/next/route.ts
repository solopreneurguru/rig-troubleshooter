import { NextResponse } from "next/server";
import { createAction, type Step, getSessionById } from "@/lib/airtable";
import { getRulePackByKey } from "@/lib/rulepacks";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, order = 1, debug } = body || {};
    if (!sessionId) throw new Error("sessionId is required");
    
    const session = await getSessionById(sessionId);
    const rpField = (process.env.SESSIONS_RULEPACK_FIELD || "RulePackKey").trim();
    const rpKey = (session as any)[rpField];
    if (!rpKey) throw new Error(`Session missing ${rpField}; choose a rule pack when creating the session.`);
    
    const pack = await getRulePackByKey(String(rpKey));
    if (!pack) throw new Error(`RulePack '${rpKey}' not found or inactive.`);
    
    let targetNodeKey: string;
    let targetNode: any;
    
    // Handle debug=safety - find first safetyGate node
    if (debug === 'safety') {
      const safetyGateNode = Object.entries(pack.nodes).find(([key, node]) => 
        (node as any).type === 'safetyGate'
      );
      
      if (!safetyGateNode) {
        throw new Error("No safetyGate node found in this rulepack");
      }
      
      [targetNodeKey, targetNode] = safetyGateNode;
    } else {
      // Normal flow - use start node or first node
      targetNodeKey = pack.start || Object.keys(pack.nodes)[0];
      targetNode = pack.nodes[targetNodeKey];
    }
    
    const step: Step = { 
      key: targetNode.key || targetNodeKey, 
      instruction: targetNode.instruction, 
      expect: targetNode.expect != null ? String(targetNode.expect) : undefined, 
      citation: targetNode.citation,
      unit: targetNode.unit,
      hazardNote: targetNode.hazardNote,
      requireConfirm: targetNode.requireConfirm
    };
    
    const actionId = await createAction(sessionId, order, step);
    return NextResponse.json({ ok: true, actionId, step, order });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
