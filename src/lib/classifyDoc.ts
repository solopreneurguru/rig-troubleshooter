/* Lightweight file classifier: MIME + filename + tiny text snippet (optional).
   Returns a canonical type we'll map to the first available doc-type field. */

export type CanonicalDocType =
  | "Manual"
  | "Procedure"
  | "Wiring Diagram"
  | "Schematic"
  | "PLC Program"
  | "Datasheet"
  | "Spec"
  | "Photo"
  | "Video"
  | "Other";

export function classifyByMimeAndName(opts: {
  mime?: string;
  filename?: string;
  snippet?: string;
}): { type: CanonicalDocType; confidence: number; reason?: string } {
  const { mime = "", filename = "", snippet = "" } = opts;
  const base = `${filename} ${snippet}`.toLowerCase();

  // MIME shortcuts
  if (mime.startsWith("image/")) return { type: "Photo", confidence: 0.95, reason: "image mime" };
  if (mime.startsWith("video/")) return { type: "Video", confidence: 0.95, reason: "video mime" };

  // Filename keywords
  const has = (re: RegExp) => re.test(base);
  if (has(/\bmanual|handbook|guide|instructions?\b/)) return { type: "Manual", confidence: 0.8 };
  if (has(/\bsop|procedure|work instruction|checklist\b/)) return { type: "Procedure", confidence: 0.8 };

  if (has(/\bwiring|diagram\b/)) return { type: "Wiring Diagram", confidence: 0.75 };
  if (has(/\bschematic\b/)) return { type: "Schematic", confidence: 0.75 };

  if (has(/\bplc|ladder|studio ?5000|rslogix|tia ?portal|step7|rungs?\b/))
    return { type: "PLC Program", confidence: 0.8 };

  if (has(/\bdatasheet|data sheet|cut ?sheet\b/)) return { type: "Datasheet", confidence: 0.75 };
  if (has(/\bspec|specification\b/)) return { type: "Spec", confidence: 0.7 };

  // Snippet bumpers
  if (has(/\brev\.|pn[: ]|manufacturer|rating\b/)) return { type: "Datasheet", confidence: 0.6 };
  if (has(/\bstep\s*[0-9]+:|lockout|tagout|ppe\b/)) return { type: "Procedure", confidence: 0.6 };

  return { type: "Other", confidence: 0.4 };
}

// Map canonical to the first available Documents doc-type field key we support
export function pickDocTypeKey(allow: Set<string>): string | undefined {
  const candidates = ["DocType", "Type", "DocumentType", "Document Type", "Category"];
  return candidates.find((k) => allow.has(k));
}

export function cleanTitleFromFilename(name?: string): string {
  if (!name) return "Document";
  const noExt = name.replace(/\.[a-z0-9]+$/i, "");
  return noExt.replace(/[_-]+/g, " ").trim();
}
