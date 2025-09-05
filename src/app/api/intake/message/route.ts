import { NextResponse } from "next/server";
import { classify } from "@/lib/symptom_map";
import { getSessionById, getEquipmentInstanceById } from "@/lib/airtable";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, text, equipmentTypeHint } = body as { 
      sessionId?: string; 
      text: string; 
      equipmentTypeHint?: string; 
    };
    
    if (!text) return NextResponse.json({ ok: false, error: "text required" }, { status: 400 });

    let finalEquipmentTypeHint = equipmentTypeHint;

    // If sessionId is present, fetch session and get equipment instance type
    if (sessionId) {
      try {
        const session = await getSessionById(sessionId);
        const equipmentInstanceIds = session.EquipmentInstance;
        
        if (equipmentInstanceIds && equipmentInstanceIds.length > 0) {
          const equipmentInstance = await getEquipmentInstanceById(equipmentInstanceIds[0]);
          const equipmentTypes = equipmentInstance.EquipmentType;
          
          if (equipmentTypes && equipmentTypes.length > 0) {
            // Get the first equipment type name
            finalEquipmentTypeHint = equipmentTypes[0];
          }
        }
      } catch (e) {
        console.warn("Failed to fetch session or equipment instance:", e);
        // Continue with text-only classification
      }
    }

    const { equipment, failureMode, disambiguation, packKeyCandidate } = classify(text);

    // If we have an equipment type hint, try to constrain the pack selection
    let packKey = packKeyCandidate;
    if (finalEquipmentTypeHint && equipment && failureMode) {
      // For now, we'll use the existing packKeyCandidate logic
      // In a more sophisticated implementation, we could filter packs by EquipmentType
      packKey = packKeyCandidate;
    }

    // Ensure consistent JSON: { ok: true, equipment, failureMode, packKey, disambiguation } or { ok:false, error }
    return NextResponse.json({
      ok: true,
      equipment,
      failureMode,
      packKey, // may be undefined if ambiguous; UI should handle
      disambiguation
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
  }
}