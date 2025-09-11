export type Citation =
  | { type: "doc"; title: string; page?: number; url?: string }
  | { type: "plc"; tag: string }
  | { type: "tp"; label: string };

const DOC_RE = /(doc|electrical|hydraulic|manual)\s*p\.?\s*(\d{1,4})/i;
const PLC_RE = /(plc[:\s-]*)([A-Za-z0-9_\.]+)/i;
const TP_RE  = /(tp[:\s-]*)([A-Za-z0-9_\-\/\.]+)/i;

export function parseCitationString(s: string | undefined | null): Citation[] {
  if (!s) return [];
  const out: Citation[] = [];
  const parts = s.split(/[;|]+/).map(p => p.trim());
  for (const p of parts) {
    const d = p.match(DOC_RE);
    if (d) { out.push({ type: "doc", title: "Electrical", page: Number(d[2]) }); continue; }
    const plc = p.match(PLC_RE);
    if (plc) { out.push({ type: "plc", tag: plc[2] }); continue; }
    const tp = p.match(TP_RE);
    if (tp) { out.push({ type: "tp", label: tp[2] }); continue; }
  }
  return out;
}

export function normalizeCitations(raw: any): Citation[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((c: any) => {
      if (c?.type === "doc") return { type:"doc", title: String(c.title||"Document"), page: c.page?Number(c.page):undefined, url: c.url };
      if (c?.type === "plc") return { type:"plc", tag: String(c.tag||"") };
      if (c?.type === "tp")  return { type:"tp",  label: String(c.label||"") };
      return null;
    }).filter(Boolean) as Citation[];
  }
  if (typeof raw === "string") return parseCitationString(raw);
  if (typeof raw === "object" && raw.citation) return parseCitationString(raw.citation);
  return [];
}

export function docHref(c: Citation): string | undefined {
  return c.type === "doc" && c.url
    ? (c.page ? `${c.url}#page=${c.page}` : c.url)
    : undefined;
}

// Enhanced citation with resolved metadata
export type EnhancedCitation = Citation & {
  kind?: "Electrical" | "Hydraulic" | "PLC" | "Manual" | "Photo";
  snippet?: string;
  documentId?: string;
  resolved?: boolean;
};

// Memory cache for request scope
const citationCache = new Map<string, any>();

/**
 * Resolve citation metadata from Airtable Documents table
 * Lightweight lookup with deadline protection and graceful fallback
 */
export async function resolveCitationMeta(citation: Citation): Promise<EnhancedCitation> {
  // For non-doc citations, return as-is
  if (citation.type !== "doc") {
    return {
      ...citation,
      kind: citation.type === "plc" ? "PLC" : "Manual",
      resolved: true
    };
  }

  // Check cache first
  const cacheKey = `doc-${citation.title}`;
  if (citationCache.has(cacheKey)) {
    const cached = citationCache.get(cacheKey);
    return {
      ...citation,
      kind: cached.DocType || "Manual",
      snippet: cached.Description?.slice(0, 200),
      documentId: cached.id,
      resolved: true
    };
  }

  try {
    // Lightweight Airtable lookup with deadline
    const { withDeadline } = await import('./withDeadline');
    
    // This would need proper Airtable implementation
    // For now, return graceful fallback
    const enhanced: EnhancedCitation = {
      ...citation,
      kind: "Manual", // Default fallback
      resolved: false
    };

    return enhanced;
  } catch (error) {
    // Graceful fallback on any error
    return {
      ...citation,
      kind: "Manual",
      resolved: false
    };
  }
}
