import { NextResponse } from "next/server";

const MIN_PROBLEM_LEN = 3;
const DEFAULT_PROBLEM = "New troubleshooting session";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      equipmentId?: string;
      problem?: string;
      // ...any other fields you support
    };

    const equipmentId = (body?.equipmentId || "").trim();
    if (!equipmentId || !equipmentId.startsWith("rec")) {
      return NextResponse.json(
        { ok: false, error: "equipmentId (rec...) required" },
        { status: 400 }
      );
    }

    let problem =
      typeof body?.problem === "string" ? body.problem.trim() : "";
    if (problem.length < MIN_PROBLEM_LEN) problem = DEFAULT_PROBLEM;

    // Create session in Airtable
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
    const TB_SESSIONS = process.env.TB_SESSIONS || "Sessions";

    const createUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TB_SESSIONS)}`;
    const res = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [{
          fields: {
            Equipment: [equipmentId],
            Problem: problem,
            Status: "Open",
            CreatedAt: new Date().toISOString(),
          }
        }]
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: "Airtable create failed", status: res.status, body: text },
        { status: 502 }
      );
    }

    const json = await res.json() as any;
    const id = json?.records?.[0]?.id;
    if (!id) throw new Error("Create failed - no record ID");

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to create session" },
      { status: 500 }
    );
  }
}