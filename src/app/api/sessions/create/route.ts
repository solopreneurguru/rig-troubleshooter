import { createSession } from "@/lib/airtable";
import { withTimeout, jsonOk, jsonErr } from "@/lib/http";

export async function POST(req: Request) {
  try {
    console.log("[create-flow] Starting session creation");
    
    const body = await withTimeout(req.json(), 5000);
    const problem = (body?.problem ?? "").trim();
    if (!problem) return jsonErr("problem is required", 422);
    
    const sessionId = await withTimeout(
      createSession(
        "", // title - will be computed by Airtable
        problem,
        body.rigId || undefined,
        body.overrideRulePackKey || undefined,
        body.equipmentId || undefined,
        undefined // failureMode
      ),
      20000, // 20s deadline
      () => console.error('[timeout]', '/api/sessions/create', { ms: 20000, hint: 'airtable' })
    );
    
    if (!sessionId) return jsonErr('failed to create session', 502);
    
    console.log(`[create-flow] Successfully created session: ${sessionId}`);
    return jsonOk({ id: sessionId, redirect: `/sessions/${encodeURIComponent(sessionId)}` }, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'ETIMEDOUT') {
      console.error('[timeout]', '/api/sessions/create', { ms: 20000, hint: 'airtable' });
      return jsonErr('upstream timeout', 504);
    }
    
    // Log Airtable error status if available
    if (e?.status) {
      console.log(`[create-flow] Airtable error status: ${e.status}`);
    }
    
    console.log(`[create-flow] Session creation error: ${e?.message || 'server error'}`);
    return jsonErr(e?.message || 'server error', 500);
  }
}

// Keep method guarders if you want:
export async function GET() {
  return jsonErr("Method Not Allowed", 405);
}