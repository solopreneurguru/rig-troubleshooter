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
