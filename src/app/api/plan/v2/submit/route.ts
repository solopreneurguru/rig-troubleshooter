import { NextResponse } from "next/server";
import { createActionAndReading, getRulePackByKey, getSessionById } from "@/lib/airtable";
import { nodePassFail, RulePackV2 } from "@/lib/rpv2";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, nodeKey, payload } = body as {
      sessionId: string;
      nodeKey: string;
      payload: { value?: number; unit?: string; pass?: boolean; confirm?: boolean; techId?: string; };
    };
    if (!sessionId || !nodeKey) return NextResponse.json({ error: "sessionId and nodeKey required" }, { status: 400 });

    const s = await getSessionById(sessionId);
    const key = s?.fields?.RulePackKey as string;
    const pack: RulePackV2 = await getRulePackByKey(key);

    const node = pack?.nodes?.[nodeKey];
    if (!node) return NextResponse.json({ error: "node not found" }, { status: 404 });

    // safety
    if (node.type === "safetyGate" && !payload?.confirm) {
      return NextResponse.json({ error: "confirmation required" }, { status: 400 });
    }

    // write action + reading
    const { actionId, readingId } = await createActionAndReading({
      sessionId,
      stepKey: nodeKey,
      instruction: node.instruction,
      expected: node.expect != null ? `${node.expect}±${node.tolerance ?? 0} ${node.unit ?? ""}` : (node.min != null ? `min ${node.min}${node.unit ?? ""}` : ""),
      citation: node.citation ?? "",
      unit: payload?.unit ?? node.unit ?? "",
      value: (typeof payload?.value === "number" ? payload?.value : undefined),
      passFail: nodePassFail(node, payload?.value, payload?.pass) ? "Pass" : "Fail",
      confirm: payload?.confirm === true ? { techId: payload.techId ?? null } : null
    });

    return NextResponse.json({ ok: true, actionId, readingId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
