import { FailureMode } from "./types";

export type EquipKey =
  | "topdrive" | "drawworks" | "ironroughneck" | "catwalk"
  | "mudpump" | "hpu" | "rotary" | "tbhook" | "phm"
  | "controlsystem" | "fingerboard";

const EQUIP_SYNONYMS: Record<EquipKey, string[]> = {
  topdrive: ["top drive","topdrive","tds","td","nov td","canrig td"],
  drawworks: ["drawworks","draw works","dw"],
  ironroughneck: ["iron roughneck","roughneck","ir"],
  catwalk: ["catwalk","power catwalk"],
  mudpump: ["mud pump","mudpump","pump","triplex","quintuplex"],
  hpu: ["hpu","hydraulic power unit","power pack"],
  rotary: ["rotary","rotary table","rt"],
  tbhook: ["traveling block","tb","hook","block"],
  phm: ["pipe handling","phm","pipe handler"],
  controlsystem: ["plc","control system","controls","siemens","tia","vfd","scr","pcs"],
  fingerboard: ["fingerboard","fb"]
};

const FAILURE_SYNONYMS: Record<string, FailureMode> = {
  "wont start": "Won't Start", "won't start": "Won't Start", "no start": "Won't Start",
  "doesn't work": "Won't Start", "doesnt work": "Won't Start",
  "isn't starting": "Won't Start", "isnt starting": "Won't Start",
  "won't run": "Won't Start", "wont run": "Won't Start",
  "not turning on": "Won't Start", "does not turn on": "Won't Start",
  "won't power up": "Won't Start", "no power": "Won't Start",
  "low rpm": "Low RPM", "slow": "Low RPM",
  "trip": "Trips", "trips": "Trips",
  "no speed ref": "No Speed Ref", "speed ref": "No Speed Ref",
  "over torque": "Over-Torque", "over-torque": "Over-Torque", "overtorque": "Over-Torque",
  "overheat": "Overheat", "hot": "Overheat",
  "oil low": "Oil Low",
  "pressure low": "Pressure Low",
  "pressure high": "Pressure High",
  "flow low": "Flow Low",
  "vibration": "Vibration", "vibrating": "Vibration",
  "interlock": "Electrical Interlock",
  "controls fault": "Controls Fault", "fault": "Controls Fault",
  "hydraulic fault": "Hydraulic Fault",
  "mechanical jam": "Mechanical Jam",
  "brake reset": "Other", "break reset": "Other", // handle typos
  "other": "Other"
};

export function classify(text: string): {
  equipment?: EquipKey;
  failureMode?: FailureMode;
  disambiguation?: string[];
  packKeyCandidate?: string;
} {
  const t = text.toLowerCase();

  // equipment pick (first match wins, but collect all to detect ambiguity)
  const matches: EquipKey[] = [];
  for (const [key, syns] of Object.entries(EQUIP_SYNONYMS) as [EquipKey,string[]][]) {
    if (syns.some(s => t.includes(s))) matches.push(key);
  }
  const equipment = matches.length === 1 ? matches[0] : undefined;

  // failure mode pick (scan keys in FAILURE_SYNONYMS)
  let failureMode: FailureMode | undefined = undefined;
  for (const [frag, mode] of Object.entries(FAILURE_SYNONYMS)) {
    if (t.includes(frag)) { failureMode = mode; break; }
  }

  // build a v2 pack key candidate if we have both
  const packKeyCandidate = (equipment && failureMode)
    ? `${equipment}.${slug(modeToShort(failureMode))}.v2`
    : undefined;

  // disambiguation when 0 or >1 equipment hits
  let disambiguation: string[] | undefined;
  if (!equipment) {
    const opts = matches.length > 1 ? matches : (Object.keys(EQUIP_SYNONYMS) as EquipKey[]);
    disambiguation = ["Which equipment is this about?", ...opts.slice(0,6).map(k => prettyEquip(k))];
  }

  return { equipment, failureMode, disambiguation, packKeyCandidate };
}

function prettyEquip(k: EquipKey) {
  const m: Record<EquipKey,string> = {
    topdrive:"Top Drive", drawworks:"Drawworks", ironroughneck:"Iron Roughneck",
    catwalk:"Catwalk", mudpump:"Mud Pump", hpu:"HPU", rotary:"Rotary Table",
    tbhook:"Trav. Block/Hook", phm:"Pipe Handling", controlsystem:"Control System",
    fingerboard:"Fingerboard"
  };
  return m[k];
}

function modeToShort(m: FailureMode) {
  const map: Record<FailureMode,string> = {
    "Won't Start":"wont_start", "Low RPM":"low_rpm", "Trips":"trips", "No Speed Ref":"no_speed_ref",
    "Over-Torque":"over_torque", "Overheat":"overheat", "Oil Low":"oil_low", "Pressure Low":"pressure_low",
    "Pressure High":"pressure_high", "Flow Low":"flow_low", "Vibration":"vibration",
    "Electrical Interlock":"electrical_interlock", "Controls Fault":"controls_fault",
    "Hydraulic Fault":"hydraulic_fault", "Mechanical Jam":"mechanical_jam", "Other":"other"
  };
  return map[m];
}

function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g,"_"); }
