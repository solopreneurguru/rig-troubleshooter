import { withDeadline } from "./withDeadline";

export type Unit = "VDC" | "VAC" | "V" | "A" | "mA" | "Ohm" | "kOhm" | "psi" | "bar" | "Hz" | "rpm";
export type MeasureUnit = Unit;

export type MeasureSpec = {
  unit: MeasureUnit;
  points?: string;             // e.g., "A16–B12"
  expect: string;              // human spec e.g., "24 VDC ±10%" | "20–28 VDC" | ">=24 VDC"
  passNext?: string;           // step id
  failNext?: string;           // step id
};

export type ParsedSpec = {
  min?: number;
  max?: number;
  exact?: number;
  cmp?: ">=" | "<=" | "==" | ">" | "<";
};

/**
 * Normalize unit string to standard format
 */
export function normalizeUnit(unit: string): Unit {
  const normalized = unit.toUpperCase().trim();
  
  // Map common variations
  const unitMap: Record<string, Unit> = {
    "V": "V",
    "VDC": "VDC",
    "VAC": "VAC",
    "VOLTS": "V",
    "VOLT": "V",
    "AMP": "A",
    "AMPS": "A",
    "A": "A",
    "MA": "mA",
    "MILLIAMP": "mA",
    "OHM": "Ohm",
    "OHMS": "Ohm",
    "Ω": "Ohm",
    "KOHM": "kOhm",
    "KOHMS": "kOhm",
    "KΩ": "kOhm",
    "PSI": "psi",
    "BAR": "bar",
    "HZ": "Hz",
    "HERTZ": "Hz",
    "RPM": "rpm"
  };

  return unitMap[normalized] || "V"; // Default fallback
}

/**
 * Convert value between compatible units
 */
export function convertUnit(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;

  // Current conversion pairs
  const conversions: Record<string, Record<string, number>> = {
    // Current conversions: mA ↔ A
    "mA": { "A": 0.001 },
    "A": { "mA": 1000 },
    
    // Resistance: kOhm ↔ Ohm
    "kOhm": { "Ohm": 1000 },
    "Ohm": { "kOhm": 0.001 },
    
    // Pressure: psi ↔ bar (approximate)
    "psi": { "bar": 0.0689476 },
    "bar": { "psi": 14.5038 },
    
    // Voltage normalization (for charting purposes)
    "VDC": { "V": 1, "VAC": 1 },
    "VAC": { "V": 1, "VDC": 1 },
    "V": { "VDC": 1, "VAC": 1 }
  };

  const factor = conversions[from]?.[to];
  if (factor !== undefined) {
    return value * factor;
  }

  // No conversion available - return original value
  return value;
}

/**
 * Parse expectation spec into min/max/exact values
 */
export function parseSpec(expect: string, unit: MeasureUnit): ParsedSpec {
  const cleanSpec = expect.trim();
  
  // Handle percentage tolerance: "24 VDC ±10%"
  const percentMatch = cleanSpec.match(/(\d+(?:\.\d+)?)\s*[A-Za-z]*\s*±\s*(\d+(?:\.\d+)?)%/);
  if (percentMatch) {
    const value = parseFloat(percentMatch[1]);
    const percent = parseFloat(percentMatch[2]);
    const tolerance = value * (percent / 100);
    return { min: value - tolerance, max: value + tolerance };
  }

  // Handle absolute tolerance: "24 ±2"
  const absToleranceMatch = cleanSpec.match(/(\d+(?:\.\d+)?)\s*±\s*(\d+(?:\.\d+)?)/);
  if (absToleranceMatch) {
    const value = parseFloat(absToleranceMatch[1]);
    const tolerance = parseFloat(absToleranceMatch[2]);
    return { min: value - tolerance, max: value + tolerance };
  }

  // Handle range: "20-28" or "20–28"
  const rangeMatch = cleanSpec.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
  }

  // Handle comparison operators: ">=24", "<=100", "==50"
  const compMatch = cleanSpec.match(/(>=|<=|==|>|<)\s*(\d+(?:\.\d+)?)/);
  if (compMatch) {
    const cmp = compMatch[1] as ParsedSpec["cmp"];
    const value = parseFloat(compMatch[2]);
    return { cmp, exact: value };
  }

  // Handle exact value: "24" or "24.5"
  const exactMatch = cleanSpec.match(/^(\d+(?:\.\d+)?)$/);
  if (exactMatch) {
    return { exact: parseFloat(exactMatch[1]) };
  }

  // Fallback - try to extract any number
  const numberMatch = cleanSpec.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) {
    return { exact: parseFloat(numberMatch[1]) };
  }

  return {}; // No parseable spec
}

/**
 * Evaluate if a reading passes the spec
 */
export function evaluate(value: number, spec: ParsedSpec): boolean {
  // Range check
  if (spec.min !== undefined && spec.max !== undefined) {
    return value >= spec.min && value <= spec.max;
  }

  // Comparison check
  if (spec.cmp && spec.exact !== undefined) {
    switch (spec.cmp) {
      case ">=": return value >= spec.exact;
      case "<=": return value <= spec.exact;
      case "==": return Math.abs(value - spec.exact) < 0.001; // Float comparison
      case ">": return value > spec.exact;
      case "<": return value < spec.exact;
      default: return false;
    }
  }

  // Exact value check (with small tolerance for floats)
  if (spec.exact !== undefined) {
    return Math.abs(value - spec.exact) < 0.001;
  }

  // No valid spec - default to pass
  return true;
}

/**
 * Format spec for display
 */
export function formatSpec(spec: ParsedSpec, unit: MeasureUnit): string {
  if (spec.min !== undefined && spec.max !== undefined) {
    return `${spec.min}–${spec.max} ${unit}`;
  }
  
  if (spec.cmp && spec.exact !== undefined) {
    return `${spec.cmp}${spec.exact} ${unit}`;
  }
  
  if (spec.exact !== undefined) {
    return `${spec.exact} ${unit}`;
  }
  
  return "No spec";
}
