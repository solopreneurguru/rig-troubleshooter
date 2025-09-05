import { NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { getSessionBundle } from "@/lib/airtable";
import { put } from "@vercel/blob";
import React from "react";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10 },
  h1: { fontSize: 16, marginBottom: 6 },
  h2: { fontSize: 12, marginTop: 10, marginBottom: 4 },
  row: { marginBottom: 4 },
  mono: { fontFamily: "Times-Roman" },
});

function ReportDoc({ data }: any) {
  const { session, rig, actions } = data;
  return React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.h1 }, "Troubleshooting Report"),
      React.createElement(View, { style: styles.row }, React.createElement(Text, null, `Session ID: ${session?.id}`)),
      React.createElement(View, { style: styles.row }, React.createElement(Text, null, `Title: ${session?.Title || ""}`)),
      React.createElement(View, { style: styles.row }, React.createElement(Text, null, `Problem: ${session?.Problem || ""}`)),
      React.createElement(View, { style: styles.row }, React.createElement(Text, null, `Rig: ${rig?.Name || "(not linked)"}  |  Status: ${session?.Status || ""}`)),
      
      React.createElement(Text, { style: styles.h2 }, "Steps & Readings"),
      ...(actions?.map((a: any, i: number) => 
        React.createElement(View, { key: a.id, wrap: false, style: { marginBottom: 6 } },
          React.createElement(Text, null, `#${a.Order ?? i+1}  ${a.StepKey} — ${a.Instruction}`),
          a.Expected ? React.createElement(Text, null, `Expected: ${a.Expected}`) : null,
          a.Citation ? React.createElement(Text, null, `Citation: ${a.Citation}`) : null,
          a.Citations ? React.createElement(Text, null, `Citations: ${JSON.stringify(a.Citations)}`) : null,
          a.PlcResult ? React.createElement(Text, null, `PLC Result: ${a.PlcResult}`) : null,
          a.PhotoUrl ? React.createElement(Text, null, `Photo: ${a.PhotoUrl}`) : null,
          ...(a.readings?.map((r: any, j: number) =>
            React.createElement(Text, { key: j, style: styles.mono }, `Reading: ${r.Value || ""} ${r.Unit || ""}  Result: ${r.PassFail || ""}`)
          ) || [])
        )
      ) || [])
    )
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const data = await getSessionBundle(sessionId);
    const pdfDoc = React.createElement(ReportDoc, { data });
    const buffer = await renderToBuffer(pdfDoc);

    // ?store=1 to save publicly and return URL (JSON); else stream PDF
    const url = new URL(_req.url);
    const store = url.searchParams.get("store");
    if (store && process.env.BLOB_READ_WRITE_TOKEN) {
      const key = `reports/${sessionId}-${Date.now()}.pdf`;
      const uploaded = await put(key, buffer, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: "application/pdf",
      });
      return NextResponse.json({ ok: true, url: uploaded.url });
    }

    return new Response(buffer as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="session-${sessionId}.pdf"` },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
