import { NextResponse } from "next/server";
import { getSessionBundle, createFinding, updateFinding } from "@/lib/airtable";
import { put } from "@vercel/blob";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10 }, h1: { fontSize: 16, marginBottom: 6 }, row: { marginBottom: 4 }
});

function MiniReport({ data, finding }: any) {
  const { session, rig } = data;
  return React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.h1 }, "Finding"),
      React.createElement(View, { style: styles.row }, React.createElement(Text, null, `Title: ${finding?.Title}`)),
      React.createElement(View, { style: styles.row }, React.createElement(Text, null, `Outcome: ${finding?.Outcome || ""}`)),
      React.createElement(View, { style: styles.row }, React.createElement(Text, null, `Summary: ${finding?.Summary || ""}`)),
      React.createElement(View, { style: styles.row }, React.createElement(Text, null, `Parts: ${finding?.Parts || ""}`)),
      React.createElement(View, { style: styles.row }, React.createElement(Text, null, `Session: ${session?.id} — ${session?.Title || ""}`)),
      React.createElement(View, { style: styles.row }, React.createElement(Text, null, `Rig: ${rig?.Name || "(not linked)"}`))
    )
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, title, outcome, summary, parts } = body || {};
    if (!sessionId || !title) throw new Error("sessionId and title are required");

    const data = await getSessionBundle(sessionId);

    // Create finding first (without URL)
    const findingId = await createFinding({
      Title: title, SessionId: sessionId, RigId: data?.rig?.id, Outcome: outcome, Summary: summary, Parts: parts
    });

    // Build PDF & store to Blob
    let reportUrl: string | undefined = undefined;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const pdfDoc = React.createElement(MiniReport, { data, finding: { Title: title, Outcome: outcome, Summary: summary, Parts: parts } });
      const pdfBytes = await renderToBuffer(pdfDoc);
      const key = `reports/findings/${sessionId}-${Date.now()}.pdf`;
      const uploaded = await put(key, pdfBytes, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: "application/pdf",
      });
      reportUrl = uploaded.url;
      await updateFinding(findingId, { ReportURL: reportUrl });
    }

    return NextResponse.json({ ok: true, findingId, reportUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
