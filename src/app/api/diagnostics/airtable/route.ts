import { table } from "@/lib/airtable";
import { withTimeout, jsonOk, jsonErr } from "@/lib/http";

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Check env vars
    const hasApiKey = !!process.env.AIRTABLE_API_KEY;
    const hasBaseId = !!process.env.AIRTABLE_BASE_ID;
    const hasRigsTable = !!process.env.TB_RIGS;
    
    if (!hasApiKey || !hasBaseId) {
      return jsonOk({
        connected: false,
        error: "Missing Airtable credentials",
        env: { hasApiKey, hasBaseId, hasRigsTable },
        latency: Date.now() - startTime
      });
    }

    // Test connection with timeout
    const tb = table(process.env.TB_RIGS || "Rigs");
    const rows = await withTimeout(
      tb.select({ fields: ["Name"], pageSize: 1 }).all(),
      5000 // 5s timeout
    );

    const latency = Date.now() - startTime;
    
    return jsonOk({
      connected: true,
      latency,
      recordCount: rows.length,
      env: { hasApiKey, hasBaseId, hasRigsTable },
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    const latency = Date.now() - Date.now();
    const errorMsg = e?.code === 'ETIMEDOUT' 
      ? "Connection timeout" 
      : (e?.message || "Connection failed");
    
    return jsonOk({
      connected: false,
      error: errorMsg,
      latency,
      timestamp: new Date().toISOString()
    });
  }
}
