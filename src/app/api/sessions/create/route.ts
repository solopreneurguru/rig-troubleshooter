import { createSession } from "@/lib/airtable";
import { withTimeout, jsonOk, jsonErr } from "@/lib/http";

export async function POST(req: Request) {
  try {
    console.log("[create-flow] Starting session creation");
    
    const body = await req.json().catch(() => ({}));
    const problem = (body.problem ?? "").trim?.();
    if (!problem) return jsonErr("Problem description is required.", 422);
    
    // Use shared timeout utility with 12s deadline
    const id = await withTimeout(
      createSession(
        "", // title - will be computed by Airtable
        problem,
        body.rigId || undefined,
        body.overrideRulePackKey || undefined,
        body.equipmentId || undefined,
        undefined // failureMode
      ),
      12000, // 12s deadline
      () => console.log("[create-flow] Session creation timeout triggered")
    );
    
    console.log(`[create-flow] Successfully created session: ${id}`);
    return jsonOk({ id, redirect: `/sessions/${encodeURIComponent(id)}` }, { status: 201 });
  } catch (e: any) {
    const errorMsg = e?.code === 'ETIMEDOUT' 
      ? "Request timed out - please try again" 
      : (e?.message || "Session creation failed");
    
    console.log(`[create-flow] Session creation error: ${errorMsg}`);
    return jsonErr(errorMsg, 500);
  }
}

// Keep method guarders if you want:
export async function GET() {
  return jsonErr("Method Not Allowed", 405);
}