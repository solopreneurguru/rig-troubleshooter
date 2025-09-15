import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { getSessionBundle } from "@/lib/airtable";
import { put } from "@vercel/blob";
import { normalizeCitations } from "@/lib/citations";
import React from "react";
import { getId, type IdContext } from "@/lib/route-ctx";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10 },
  h1: { fontSize: 16, marginBottom: 6 },
  h2: { fontSize: 12, marginTop: 10, marginBottom: 4 },
  row: { marginBottom: 4 },
  mono: { fontFamily: "Times-Roman" },
  citation: { fontSize: 8, marginTop: 2, marginLeft: 10, color: "#666666" },
  citationTitle: { fontSize: 8, fontWeight: "bold", color: "#444444" }
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
      ...(actions?.map((a: any, i: number) => {
        const citations = normalizeCitations(a.Citations ?? a.Citation);
        return React.createElement(View, { key: a.id, wrap: false, style: { marginBottom: 8 } },
          React.createElement(Text, null, `#${a.Order ?? i+1}  ${a.StepKey} — ${a.Instruction}`),
          a.Expected ? React.createElement(Text, null, `Expected: ${a.Expected}`) : null,
          
          // Enhanced citations display
          citations.length > 0 ? React.createElement(View, { style: { marginTop: 4 } },
            React.createElement(Text, { style: styles.citationTitle }, "Why:"),
            ...citations.map((c: any, j: number) => {
              const displayText = c.type === "doc" 
                ? `${c.title || "Document"}${c.page ? ` (p.${c.page})` : ""}`
                : c.type === "plc" 
                ? `PLC Tag: ${c.tag}`
                : `Test Point: ${c.label}`;
              
              return React.createElement(Text, { key: j, style: styles.citation }, 
                `• ${displayText}${c.snippet ? ` - "${c.snippet.slice(0, 160)}${c.snippet.length > 160 ? '...' : ''}"` : ''}`
              );
            })
          ) : null,
          
          a.PlcResult ? React.createElement(Text, null, `PLC Result: ${a.PlcResult}`) : null,
          a.PhotoUrl ? React.createElement(Text, null, `Photo: ${a.PhotoUrl}`) : null,
          
          // Safety confirmation info
          a.SafetyConfirmedBy ? React.createElement(View, { style: { marginTop: 2 } },
            React.createElement(Text, { style: styles.citation }, 
              `Safety: confirmed by ${a.SafetyConfirmedBy} at ${a.SafetyConfirmedAt ? new Date(a.SafetyConfirmedAt).toLocaleDateString() : 'unknown'}${a.SafetyChecklist ? ` — [${a.SafetyChecklist}]` : ''}`
            )
          ) : null,
          
          // Reading info (latest reading for this step)
          ...(a.readings?.filter((r: any) => r.StepId === a.StepKey).slice(-1).map((r: any) => 
            React.createElement(Text, { style: styles.citation }, 
              `Reading: ${r.Value} ${r.Unit} → ${r.Pass ? 'PASS' : 'FAIL'} (Spec: ${r.Spec}${r.Points ? `; Points: ${r.Points}` : ''})`
            )
          ) || []),
          
          // History summary (last 5 readings)
          (() => {
            const stepReadings = a.readings?.filter((r: any) => r.StepId === a.StepKey) || [];
            if (stepReadings.length <= 1) return null;
            
            const last5 = stepReadings.slice(-5);
            const passCount = last5.filter((r: any) => r.Pass).length;
            const passRate = Math.round((passCount / last5.length) * 100);
            const values = last5.map((r: any) => `${r.Value}`).join(', ');
            const unit = last5[0]?.Unit || '';
            
            return React.createElement(Text, { style: styles.citation }, 
              `History (last ${last5.length}): ${values} ${unit} — pass rate: ${passRate}%`
            );
          })()
        );
      }) || [])
    )
  );
}

export async function GET(req: NextRequest, ctx: IdContext) {
  try {
    const sessionId = await getId(ctx);
    const data = await getSessionBundle(sessionId);
    const pdfDoc = React.createElement(ReportDoc, { data });
    const buffer = await renderToBuffer(pdfDoc);

    // ?store=1 to save publicly and return URL (JSON); else stream PDF
    const url = new URL(req.url);
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
