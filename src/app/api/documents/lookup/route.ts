import { NextResponse } from "next/server";
import Airtable from "airtable";

const apiKey = process.env.AIRTABLE_API_KEY?.trim();
const baseId = process.env.AIRTABLE_BASE_ID;
const TB_DOCS = process.env.TB_DOCS!;

if (!apiKey || !baseId) {
  console.warn("[documents/lookup] Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
}

const base = apiKey && baseId ? new Airtable({ apiKey }).base(baseId) : null;

function table(tableId?: string) {
  if (!base) throw new Error("Airtable base not configured");
  if (!tableId) throw new Error("Airtable table ID not provided");
  return base(tableId);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const title = (searchParams.get("title") || "").trim();
    const equipmentId = (searchParams.get("equipmentId") || "").trim();
    if (!title) return NextResponse.json({ ok:false, error:"missing title" }, { status: 400 });

    const filters: string[] = [`{Title} = '${title.replace(/'/g,"\\'")}'`];
    if (equipmentId) filters.push(`FIND('${equipmentId.replace(/'/g,"\\'")}', ARRAYJOIN({Equipment}))`);
    const formula = `AND(${filters.join(",")})`;

    const docsTbl = table(TB_DOCS);
    const res = await docsTbl
      .select({ filterByFormula: formula, maxRecords: 1 })
      .firstPage();
    if (!res?.length) return NextResponse.json({ ok:false, found:false });

    const r = res[0];
    // Expect BlobURL in {BlobURL} or Attachment field; adapt if your column is named differently
    const blobUrl = r.get("BlobURL") as string | undefined;
    const out = { ok:true, found:true, id: r.id, title: r.get("Title"), blobUrl };
    return NextResponse.json(out);
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message || String(e) }, { status: 500 });
  }
}
