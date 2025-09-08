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

    // Use shared timeout utility with 8s deadline
    const tb = table(process.env.TB_RIGS || "Rigs");
    const rows = await withTimeout(
      tb.select({ fields: ["Name"], pageSize: 100 }).all(),
      8000, // 8s deadline
      () => console.log("[create-flow] Rigs list timeout triggered")
    );

    const rigs = rows
      .map(r => ({ id: r.id as string, name: (r.get("Name") as string) || "" }))
      .filter(r => r.name);

    console.log(`[create-flow] Successfully fetched ${rigs.length} rigs`);
    return jsonOk({ rigs });
  } catch (e: any) {
    const errorMsg = e?.code === 'ETIMEDOUT' 
      ? "Request timed out - please try again" 
      : (e?.message || "list rigs failed");
    
    console.log(`[create-flow] Rigs list error: ${errorMsg}`);
    return jsonErr(errorMsg, 500);
  }
}
