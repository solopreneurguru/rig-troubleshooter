// src/lib/symptom_map.ts
export type SymptomGuess = {
  equipmentType?: string;   // e.g., "TopDrive"
  failureMode?: string;     // e.g., "Won't Start"
  packKey?: string | null;  // e.g., "topdrive.wont_start.v2"
  confidence: number;       // 0..1
  reason: string;           // debug string
};

const RX = {
  // Equipment mentions
  TOPDRIVE: /\btop\s*drive\b|\btopdrive\b|\btd\d+\b/i,

  // Failure mode: "won't start", "isn't starting", "does not start", "can't start", etc.
  WONT_START: /\b(won[']?t|can[']?t|does\s*not|doesn[']?t|isn[']?t)\s*(start|turn\s*on|power\s*up)\b/i,

  // Context: "brake reset" with common typo "break reset", "brake release", "reset after brake"
  BRAKE_RESET: /\bbrak[e]?\b.*\breset\b|\bbreak\b.*\breset\b|\bbrake\s*release\b|\breset.*brake\b/i,

  // Other example: low rpm
  LOW_RPM: /\b(low|insufficient)\b.*\brpm\b|\brpm\b.*\blow\b/i,
};

export function guessSymptom(input: string): SymptomGuess {
  const text = (input || "").toLowerCase();
  const isTopDrive = RX.TOPDRIVE.test(text);

  // TopDrive — won't start after brake reset => v2 key
  if (isTopDrive && RX.WONT_START.test(text) && RX.BRAKE_RESET.test(text)) {
    return {
      equipmentType: "TopDrive",
      failureMode: "Won't Start",
      packKey: "topdrive.wont_start.v2",
      confidence: 0.9,
      reason: "topdrive + wont_start + brake_reset",
    };
  }

  // TopDrive — Low RPM => v2 key
  if (isTopDrive && RX.LOW_RPM.test(text)) {
    return {
      equipmentType: "TopDrive",
      failureMode: "Low RPM",
      packKey: "topdrive.rpm.low.v2",
      confidence: 0.75,
      reason: "topdrive + low_rpm",
    };
  }

  // Equipment only
  if (isTopDrive) {
    return {
      equipmentType: "TopDrive",
      failureMode: undefined,
      packKey: null,
      confidence: 0.5,
      reason: "equipment only",
    };
  }

  // No match
  return {
    equipmentType: undefined,
    failureMode: undefined,
    packKey: null,
    confidence: 0.0,
    reason: "no match",
  };
}

// Legacy wrapper for backward compatibility
export function classify(text: string): {
  equipment?: string;
  failureMode?: string;
  disambiguation?: string[];
  packKeyCandidate?: string;
} {
  const g = guessSymptom(text);
  return {
    equipment: g.equipmentType?.toLowerCase(),
    failureMode: g.failureMode,
    packKeyCandidate: g.packKey || undefined,
    disambiguation: g.confidence < 0.5 ? ["Which equipment is this about?", "TopDrive"] : undefined,
  };
}