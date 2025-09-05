import { NextResponse } from "next/server";
import Airtable from "airtable";

const apiKey = process.env.AIRTABLE_API_KEY?.trim();
const baseId = process.env.AIRTABLE_BASE_ID;
const RULEPACKS_ID = process.env.TB_RULEPACKS!;
const EQUIPTYPES_ID = process.env.TB_EQUIPMENT_TYPES || process.env.TB_EQUIP_TYPES;

const base = apiKey && baseId ? new Airtable({ apiKey }).base(baseId) : null;
const table = (id?: string) => {
  if (!base) throw new Error("Airtable base not configured");
  if (!id) throw new Error("Airtable table ID not provided");
  return base(id);
};

function normalize(record: any) {
  return { id: record.id, ...(record.fields as any) };
}

const SAMPLE_PLUS = {
  key: "demo.topdrive.block15.v2",
  version: 2,
  entry: "start",
  steps: {
    start: { 
      id: "start", 
      kind: "info", 
      markdown: "Begin permissives check.", 
      citations: [] 
    },
    plc_enable_chain: {
      id: "plc_enable_chain",
      kind: "plc_read",
      tag: "MainContactorEnable",
      expect: { op: "==", value: 1 },
      source: { rigEquipId: "RE_DEMO_1", table: "TagTable", program: "OB1" },
      citations: [{ 
        docId: "DOC_PLC_001", 
        tagRef: { program: "OB1", tag: "MainContactorEnable", address: "%I0.2" }, 
        note: "Enable chain input" 
      }],
      nextOn: { pass: "photo_panel", fail: "end_block" }
    },
    photo_panel: {
      id: "photo_panel",
      kind: "photo",
      prompt: "Take a clear photo of the enable chain relay and F3 fuse.",
      required: true,
      storeTo: "Readings",
      citations: [{ 
        docId: "DOC_ELEC_042", 
        page: 12, 
        note: "F3 fuse on diagram" 
      }],
      next: "end_block"
    },
    end_block: { 
      id: "end_block", 
      kind: "end" 
    }
  }
};

// Allow only with an admin token in production
function isProdAllowed(req: Request) {
  const token = req.headers.get('x-admin-token');
  const need = process.env.ADMIN_DEV_TOKEN;
  return !!need && !!token && token === need;
}

export async function POST(req: Request) {
  const env = process.env.VERCEL_ENV; // 'production' | 'preview' | 'development'
  if (env === 'production' && !isProdAllowed(req)) {
    return NextResponse.json({ ok: false, error: 'Disabled in production' }, { status: 403 });
  }
  if (!RULEPACKS_ID) {
    return NextResponse.json({ ok: false, error: "TB_RULEPACKS missing" }, { status: 500 });
  }

  try {
    const packsTbl = table(RULEPACKS_ID);
    // Upsert by Key (case-insensitive)
    const found = await packsTbl.select({
      filterByFormula: `LOWER({Key})=LOWER("${SAMPLE_PLUS.key}")`,
      maxRecords: 1
    }).firstPage();

    // Link EquipmentType "TopDrive" if available (optional)
    let equipTypeLink: string[] | undefined = undefined;
    try {
      if (EQUIPTYPES_ID) {
        const etTbl = table(EQUIPTYPES_ID);
        const et = await etTbl.select({
          filterByFormula: `LOWER({Name})="topdrive"`,
          maxRecords: 1
        }).firstPage();
        if (et && et[0]) equipTypeLink = [et[0].id];
      }
    } catch {}

    const fields: any = {
      Key: SAMPLE_PLUS.key,
      Active: true,
      Json: JSON.stringify(SAMPLE_PLUS, null, 2),
    };
    // Only set the link if the column exists in your base:
    // Try EquipmentType first, then EquipmentTypeLink (whichever exists).
    try { fields["EquipmentType"] = equipTypeLink; } catch {}
    try { fields["EquipmentTypeLink"] = equipTypeLink; } catch {}

    if (found && found[0]) {
      const updated = await packsTbl.update(found[0].id, fields);
      return NextResponse.json({ ok: true, action: "updated", id: updated.id, key: SAMPLE_PLUS.key });
    } else {
      const created = await packsTbl.create([{ fields }]);
      const rec = created && created[0] ? normalize(created[0]) : null;
      return NextResponse.json({ ok: true, action: "created", id: rec?.id, key: SAMPLE_PLUS.key });
    }
  } catch (err:any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
