import { NextResponse } from "next/server";
import { listRulePacks, RulePackV2Schema } from "@/lib/rulepacks";
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    const packs = await listRulePacks();
    
    // Add isV2 flag to each pack and filter
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
    
    // Filter by type if provided
    let filteredPacks = packsWithV2Flag;
    if (type) {
      filteredPacks = packsWithV2Flag.filter((pack: any) => 
        pack.EquipmentType === type
      );
    }
    
    // Sort by Key ascending
    filteredPacks.sort((a: any, b: any) => {
      const keyA = a.Key || '';
      const keyB = b.Key || '';
      return keyA.localeCompare(keyB);
    });
    
    // Ensure response items include { id, key, equipmentType, active }
    const responsePacks = filteredPacks.map((pack: any) => ({
      id: pack.id,
      key: pack.Key,
      equipmentType: pack.EquipmentType,
      active: pack.Active || true,
      isV2: pack.isV2
    }));
    
    return NextResponse.json({ ok: true, packs: responsePacks });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
