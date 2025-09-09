import { table } from "@/lib/airtable";
import { withTimeout, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Check env vars
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      return jsonOk({ ok: false, error: "Missing Airtable credentials" });
    }

    // Test connection with timeout
    const tb = table(process.env.TB_RIGS || "Rigs");
    await withTimeout(
      tb.select({ fields: ["Name"], pageSize: 1 }).all(),
      8000 // 8s timeout
    );

    const ms = Date.now() - startTime;
    return jsonOk({ ok: true, ms });
  } catch (e: any) {
    const ms = Date.now() - Date.now();
    const errorMsg = e?.code === 'ETIMEDOUT' 
      ? "Connection timeout" 
      : (e?.message || "Connection failed");
    
    return jsonOk({ ok: false, error: errorMsg, ms });
  }
}
