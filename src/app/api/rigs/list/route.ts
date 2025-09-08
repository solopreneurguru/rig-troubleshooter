import { table } from "@/lib/airtable";
import { withTimeout, jsonOk, jsonErr } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("[create-flow] Starting rigs list fetch");
    
    // Basic env sanity (health already does this, but fail fast here too)
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      console.log("[create-flow] Missing Airtable env keys");
      return jsonErr("Airtable env missing", 500);
    }

    // Use shared timeout utility with 15s deadline
    const tb = table(process.env.TB_RIGS || "Rigs");
    const rows = await withTimeout(
      tb.select({ fields: ["Name"], pageSize: 100 }).all(),
      15000, // 15s deadline
      () => console.error('[timeout]', '/api/rigs/list', { ms: 15000, hint: 'airtable' })
    );

    const rigs = rows
      .map(r => ({ id: r.id as string, name: (r.get("Name") as string) || "" }))
      .filter(r => r.name);

    console.log(`[create-flow] Successfully fetched ${rigs.length} rigs`);
    return jsonOk({ rigs });
  } catch (e: any) {
    if (e?.code === 'ETIMEDOUT') {
      console.error('[timeout]', '/api/rigs/list', { ms: 15000, hint: 'airtable' });
      return jsonErr('upstream timeout', 504);
    }
    
    console.log(`[create-flow] Rigs list error: ${e?.message || 'server error'}`);
    return jsonErr(e?.message || 'server error', 500);
  }
}
