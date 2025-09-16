import { NextResponse } from "next/server";
import { airtableCreate, airtablePatch } from "@/lib/airtable-rest";
import { getAirtableEnv } from "@/lib/env";

export const runtime = "nodejs";

interface ReportDraft {
  title: string;
  status: string;
  summary: string;
  parts: string[];
  docIds: string[];
}

export async function POST(req: Request) {
  console.log("api_start", { route: "reports/save", time: new Date().toISOString() });

  try {
    const A = getAirtableEnv({ need: ["sessions", "findings"] });
    const body = await req.json();
    const { sessionId, draft } = body as { sessionId: string; draft: ReportDraft };

    if (!sessionId || !draft) {
      return NextResponse.json(
        { ok: false, error: "sessionId and draft required" },
        { status: 400 }
      );
    }

    // 1. Create or update finding record
    const findingFields = {
      Title: draft.title,
      Session: [sessionId],
      Status: draft.status,
      Summary: draft.summary,
      Parts: draft.parts.join("\n"),
      LinkedDocs: draft.docIds,
    };

    // Try to find existing finding for this session
    const findingsRes = await fetch(`/api/findings/by-session/${sessionId}`);
    const findingsData = await findingsRes.json().catch(() => ({}));
    const existingFindingId = findingsData?.ok && findingsData?.findings?.[0]?.id;

    let findingId: string;
    if (existingFindingId) {
      // Update existing
      const updated = await airtablePatch(A.tables.findings, existingFindingId, findingFields);
      findingId = updated.id;
    } else {
      // Create new
      const created = await airtableCreate(A.tables.findings, findingFields);
      findingId = created.id;
    }

    // 2. Generate PDF (reuse existing PDF route)
    const pdfRes = await fetch(`/api/report/${findingId}/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    if (!pdfRes.ok) {
      throw new Error("Failed to generate PDF");
    }

    const pdfData = await pdfRes.json();
    const pdfUrl = pdfData?.url;

    if (!pdfUrl) {
      throw new Error("PDF generation succeeded but no URL returned");
    }

    // 3. Update finding with PDF URL
    await airtablePatch(A.tables.findings, findingId, {
      ReportURL: pdfUrl,
    });

    // 4. Update session status if needed
    if (draft.status === "Resolved") {
      await airtablePatch(A.tables.sessions, sessionId, {
        Status: "Closed",
      });
    }

    return NextResponse.json({
      ok: true,
      findingId,
      pdfUrl,
    });
  } catch (err: any) {
    console.error("api_error", { 
      route: "reports/save", 
      err: String(err), 
      stack: err?.stack 
    });
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}