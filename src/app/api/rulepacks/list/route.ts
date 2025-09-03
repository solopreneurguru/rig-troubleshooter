import { NextResponse } from "next/server";
import { listRulePacks, RulePackV2Schema } from "@/lib/rulepacks";
export const runtime = "nodejs";
export async function GET() {
  try {
    const packs = await listRulePacks();
    
    // Add isV2 flag to each pack
    const packsWithV2Flag = packs.map((pack: any) => {
      let isV2 = false;
      try {
        if (pack.Json) {
          const json = typeof pack.Json === "string" ? JSON.parse(pack.Json) : pack.Json;
          isV2 = RulePackV2Schema.safeParse(json).success;
        }
      } catch (e) {
        // If parsing fails, assume it's not v2
        isV2 = false;
      }
      
      return {
        ...pack,
        isV2
      };
    });
    
    return NextResponse.json({ ok: true, packs: packsWithV2Flag });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
