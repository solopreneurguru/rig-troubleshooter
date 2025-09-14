import { NextResponse } from "next/server";
import { airtableCreate, airtablePatch } from "@/lib/airtable-rest";

interface ReportDraft {
  title: string;
  status: string;
  summary: string;
  parts: string[];
  docIds: string[];
}

const TB_FINDINGS = process.env.TB_FINDINGS || "Findings";
const TB_SESSIONS = process.env.TB_SESSIONS || "Sessions";

export async function POST(req: Request) {
  try {
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
      const updated = await airtablePatch(TB_FINDINGS, existingFindingId, findingFields);
      findingId = updated.id;
    } else {
      // Create new
      const created = await airtableCreate(TB_FINDINGS, findingFields);
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
    await airtablePatch(TB_FINDINGS, findingId, {
      ReportURL: pdfUrl,
    });

    // 4. Update session status if needed
    if (draft.status === "Resolved") {
      await airtablePatch(TB_SESSIONS, sessionId, {
        Status: "Closed",
      });
    }

    return NextResponse.json({
      ok: true,
      findingId,
      pdfUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
