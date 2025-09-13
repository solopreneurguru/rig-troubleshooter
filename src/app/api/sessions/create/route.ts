import { NextResponse } from "next/server";
import Airtable from "airtable";
import { getTableFields } from "@/lib/airtable-metadata";

const DEFAULT_PROBLEM = "New troubleshooting session";
const TB_SESSIONS = process.env.TB_SESSIONS || "Sessions";

function getAirtableBase() {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  if (!API_KEY || !BASE_ID) {
    throw new Error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
  }
  Airtable.configure({ apiKey: API_KEY });
  return { base: new Airtable().base(BASE_ID), API_KEY, BASE_ID };
}

function validRecId(v?: string | null) {
  return !!v && typeof v === "string" && v.startsWith("rec");
}

export async function POST(req: Request) {
  try {
    const { base, API_KEY, BASE_ID } = getAirtableBase();

    const body = (await req.json().catch(() => ({}))) as {
      equipmentId?: string;
      problem?: string;
    };

    const equipmentId = (body?.equipmentId || "").trim();
    if (!validRecId(equipmentId)) {
      return NextResponse.json(
        { ok: false, error: "equipmentId must be a valid Airtable record id (starts with rec)" },
        { status: 400 }
      );
    }

    // Problem fallback
    let problem = (body?.problem || "").trim();
    if (problem.length < 3) problem = DEFAULT_PROBLEM;

    // Discover available fields on the Sessions table
    const allow = new Set(await getTableFields(base, TB_SESSIONS));

    // Flexible candidates
    const LINK_FIELDS = [
      "Rig",
      "Equipment",
      "RigEquipment",
      "EquipmentInstance",
      "EquipmentInstances",
      "Rig Equipment",
    ];
    const PROBLEM_FIELDS = ["Problem", "Issue", "Summary", "Title", "Finding", "Finding Title"];

    const firstExisting = (cands: string[]) => cands.find((f) => allow.has(f));

    const linkKey = firstExisting(LINK_FIELDS);
    if (!linkKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "No equipment link field found on Sessions table",
          debug: { table: TB_SESSIONS, allow: [...allow], tried: LINK_FIELDS },
        },
        { status: 500 }
      );
    }

    const problemKey = firstExisting(PROBLEM_FIELDS);

    // Build Airtable fields payload
    const fields: Record<string, any> = {};
    fields[linkKey] = [{ id: equipmentId }];
    if (problemKey) fields[problemKey] = problem;

    // REST create (avoids SDK quirks)
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TB_SESSIONS)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }] }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: "Airtable create failed",
          status: res.status,
          body: text,
          debug: { table: TB_SESSIONS, fields },
        },
        { status: 502 }
      );
    }

    const json = (await res.json().catch(() => ({}))) as any;
    const id = json?.records?.[0]?.id;
    if (!validRecId(id)) {
      return NextResponse.json(
        { ok: false, error: "Create succeeded but no record id returned", debug: json },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to create session" },
      { status: 500 }
    );
  }
}