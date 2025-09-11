export type FailureMode =
  | "Won't Start" | "Low RPM" | "Trips" | "No Speed Ref"
  | "Over-Torque" | "Overheat" | "Oil Low" | "Pressure Low"
  | "Pressure High" | "Flow Low" | "Vibration"
  | "Electrical Interlock" | "Controls Fault" | "Hydraulic Fault"
  | "Mechanical Jam" | "Other";

export interface AirtableRecord<T> { 
  id: string; 
  fields: T; 
  createdTime?: string; 
}

export interface SessionRec {
  Title?: string;
  Rig?: string[];                  // linked recIds
  EquipmentInstance?: string[];    // linked recIds
  Problem?: string;
  FailureMode?: FailureMode;
  Status?: "Open" | "Closed";
  RulePackKey?: string;            // keep as text for now
}

export interface SignalRec {
  Tag: string;
  Equipment?: string[];            // EquipmentInstances link
  Address?: string;
  Unit?: string;
  Description?: string;
}

export interface TestPointRec {
  Label: string;
  Equipment?: string[];
  Reference?: string;
  Nominal?: number;
  Unit?: string;
  DocRef?: string[];               // Documents link
  DocPage?: number;                // page number (anchor built in app)
  Notes?: string;
}

export interface FindingRec {
  Title?: string;
  Session?: string[];
  Rig?: string[];
  Equipment?: string[];
  Outcome?: string;
  FailureMode?: FailureMode;
  Summary?: string;
  ReportURL?: string;
}

export type Citation = {
  kind: "Electrical" | "Hydraulic" | "PLC" | "Manual" | "Photo";
  documentId: string;     // Airtable Documents recordId
  page?: number;          // 1-based page number
  locator?: string;       // e.g., "Rung K201", "FB3", "Tag: ENABLE_OK"
  snippet?: string;       // <= 200 chars (optional)
  url?: string;           // optional direct URL to blob/page if available
  title?: string;         // convenience title if resolver adds it
};

// Measure specification for numeric readings
export type MeasureSpec = {
  unit: "VDC" | "VAC" | "A" | "mA" | "Ohm" | "kOhm" | "psi" | "bar" | "Hz" | "rpm";
  points?: string;             // e.g., "A16–B12"
  expect: string;              // human spec e.g., "24 VDC ±10%" | "20–28 VDC" | ">=24 VDC"
  passNext?: string;           // step id
  failNext?: string;           // step id
};

// Enhanced step type for v2 with safety gating and measurements
export type PlanStepV2 = {
  id: string;
  kind: "info" | "ask" | "measure" | "plc_read" | "photo" | "end";
  instruction?: string;
  requiresSafetyGate?: boolean;        // if true, gate the action
  safetyChecklist?: string[];          // optional check items
  citations?: Citation[];
  measure?: MeasureSpec;               // for measure steps
  // Additional step-specific fields...
};