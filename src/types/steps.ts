export type Citation = {
  docId: string;                // Airtable Documents record id
  page?: number;                // For PDFs
  blobUrl?: string;             // Signed or public Blob URL (if available)
  bbox?: [number, number, number, number]; // Optional crop rect [x,y,w,h]
  tagRef?: { program?: string; block?: string; tag?: string; address?: string };
  note?: string;
};

export type BaseStep = {
  id: string;
  safetyGate?: boolean;         // already supported in v2 flow
  citations?: Citation[];
};

export type InfoStep = BaseStep & {
  kind: 'info';
  markdown: string;
};

export type AskStep = BaseStep & {
  kind: 'ask';
  prompt: string;
  next: string;
};

export type MeasureStep = BaseStep & {
  kind: 'measure';
  units: string;                // e.g., 'VDC'
  expect: { min?: number; max?: number; equals?: number };
  nextOn: { pass: string; fail: string };
};

export type PlcReadStep = BaseStep & {
  kind: 'plc_read';
  tag: string;                  // exact tag from ingested table
  expect: { op: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in'; value: number | string | number[] | string[] };
  source: { rigEquipId: string; table: 'TagTable'; program?: string };
  nextOn: { pass: string; fail: string };
};

export type PhotoStep = BaseStep & {
  kind: 'photo';
  prompt: string;               // what to capture
  required?: boolean;           // if true, block Next until at least one upload
  annotate?: boolean;           // reserved for future
  storeTo: 'Readings' | 'Documents';
  next: string;
};

export type EndStep = BaseStep & {
  kind: 'end';
};

export type V2Step =
  | InfoStep
  | AskStep
  | MeasureStep
  | PlcReadStep
  | PhotoStep
  | EndStep;
