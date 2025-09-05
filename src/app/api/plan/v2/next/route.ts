import { NextResponse } from "next/server";
import { getSessionById, getRulePackByKey, getLastActionForSession } from "@/lib/airtable";
import type { RulePackV2 } from "@/lib/rpv2";

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const session = await getSessionById(sessionId);
    const key = session?.fields?.RulePackKey as string | undefined;
    if (!key || !key.endsWith(".v2")) return NextResponse.json({ error: "not a v2 session" }, { status: 400 });

    const pack: RulePackV2 = await getRulePackByKey(key);
    if (!pack) return NextResponse.json({ error: "pack not found" }, { status: 404 });

    // decide next node: if no actions yet -> start; else based on last action result.pass/fail
    const last = await getLastActionForSession(sessionId);
    let nodeKey = pack.start;
    if (last) {
      const lastNodeKey = last.fields.StepKey as string;
      const lastResult = last.fields.Result as "Pass" | "Fail" | "Pending" | undefined;
      const n = pack.nodes[lastNodeKey];
      if (n && lastResult) {
        nodeKey = (lastResult === "Pass" ? n.passNext : n.failNext) || "done";
      }
    }
    const node = pack.nodes[nodeKey] ?? { type: "done", instruction: "Complete." };
    return NextResponse.json({ ok: true, nodeKey, node, packKey: pack.key });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}
