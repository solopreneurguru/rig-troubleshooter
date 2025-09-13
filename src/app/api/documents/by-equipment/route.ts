import { NextResponse } from "next/server";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";
const TB_DOCS = process.env.TB_DOCS || "Documents";

// Common field name patterns
const TITLE_FIELDS = ["Title", "Name"];
const TYPE_FIELDS = ["DocType", "Type"];
const URL_FIELDS = ["BlobURL", "URL", "Url"];
const ATTACHMENT_FIELDS = ["Attachments", "Files"];
const LINK_FIELDS = ["RigEquipment", "Equipment", "EquipmentInstances"];

function validRecId(id: unknown): id is string {
  return typeof id === "string" && id.startsWith("rec") && id.length >= 10;
}

function esc(s: string): string {
  return s.replace(/'/g, "\\'");
}

async function fetchAirtable(
  baseId: string,
  tableName: string,
  apiKey: string,
  params: Record<string, string>
) {
  const url = new URL(
    `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`
  );
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.append(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export async function GET(req: Request) {
  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { ok: false, error: "Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const rec = url.searchParams.get("rec");
    const q = url.searchParams.get("q")?.trim();
    const type = url.searchParams.get("type")?.trim();
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50", 10),
      200
    );

    if (!validRecId(rec)) {
      return NextResponse.json(
        { ok: false, error: "rec parameter required (equipment id)" },
        { status: 400 }
      );
    }

    // Get table schema to find field names
    const { ok: schemaOk, json: schema } = await fetchAirtable(
      AIRTABLE_BASE_ID,
      TB_DOCS,
      AIRTABLE_API_KEY,
      {}
    );

    if (!schemaOk) {
      return NextResponse.json(
        { ok: false, error: "Failed to fetch table schema" },
        { status: 500 }
      );
    }

    const fields = new Set(Object.keys(schema?.fields || {}));
    const titleKey = TITLE_FIELDS.find(f => fields.has(f)) || "Title";
    const typeKey = TYPE_FIELDS.find(f => fields.has(f)) || "Type";
    const urlKey = URL_FIELDS.find(f => fields.has(f));
    const attachKey = ATTACHMENT_FIELDS.find(f => fields.has(f));
    const linkKey = LINK_FIELDS.find(f => fields.has(f));

    if (!linkKey) {
      return NextResponse.json(
        { ok: false, error: "No equipment link field found in Documents table" },
        { status: 500 }
      );
    }

    // Build filter formula
    let formula = `FIND("${esc(rec)}", ARRAYJOIN({${linkKey}}))`;
    if (type) {
      formula = `AND(${formula}, LOWER({${typeKey}}) = LOWER('${esc(type)}'))`;
    }
    if (q) {
      formula = `AND(${formula}, FIND(LOWER('${esc(q)}'), LOWER({${titleKey}})) > 0)`;
    }

    // Fetch documents
    const { ok, json } = await fetchAirtable(AIRTABLE_BASE_ID, TB_DOCS, AIRTABLE_API_KEY, {
      filterByFormula: formula,
      sort: '[{"field":"CreatedAt","direction":"desc"}]',
      maxRecords: "200",
    });

    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    // Map records to consistent shape
    const items = (json.records || [])
      .slice(0, limit)
      .map((r: any) => {
        const fields = r.fields || {};
        let url = urlKey ? fields[urlKey] : null;
        if (!url && attachKey) {
          const attachments = fields[attachKey] || [];
          url = attachments[0]?.url;
        }
        return {
          id: r.id,
          title: fields[titleKey] || "Untitled",
          type: fields[typeKey] || "Other",
          url,
          createdAt: fields.CreatedAt || null,
        };
      })
      .filter((doc: any) => doc.url); // Only return docs with a URL

    return NextResponse.json({
      ok: true,
      items,
      count: items.length,
      table: TB_DOCS,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "unexpected error" },
      { status: 500 }
    );
  }
}
