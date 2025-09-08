import { NextResponse } from "next/server";
import { upsertRulePackByKey } from "@/lib/rulepacks";

const SAMPLE_PLUS = {
  key: "demo.topdrive.block15.v2",
  version: 2,
  active: true,
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
        tagRef: { program: "OB1", tag: "MainContactorEnable", address: "%I0.2" } 
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
        note: "F3 fuse diagram" 
      }],
      next: "end_block"
    },
    end_block: { 
      id: "end_block", 
      kind: "end" 
    }
  }
};

function hasAdmin(req: Request) {
  const token = req.headers.get('x-admin-token');
  const need = process.env.ADMIN_DEV_TOKEN;
  return !!need && !!token && token === need;
}

export async function POST(req: Request) {
  const env = process.env.VERCEL_ENV; // 'production' | 'preview' | 'development'
  if (env === 'production' && !hasAdmin(req)) {
    return NextResponse.json({ ok: false, error: 'Disabled in production' }, { status: 403 });
  }

  const key = 'demo.topdrive.block15.v2';
  const pack = {
    key,
    version: 2,
    active: true,
    entry: 'start',
    steps: {
      start: { id: 'start', kind: 'info', markdown: 'Begin permissives check.', citations: [] },
      plc_enable_chain: {
        id: 'plc_enable_chain',
        kind: 'plc_read',
        tag: 'MainContactorEnable',
        expect: { op: '==', value: 1 },
        source: { rigEquipId: 'RE_DEMO_1', table: 'TagTable', program: 'OB1' },
        citations: [{ docId: 'DOC_PLC_001', tagRef: { program: 'OB1', tag: 'MainContactorEnable', address: '%I0.2' } }],
        nextOn: { pass: 'photo_panel', fail: 'end_block' }
      },
      photo_panel: {
        id: 'photo_panel',
        kind: 'photo',
        prompt: 'Take a clear photo of the enable chain relay and F3 fuse.',
        required: true,
        storeTo: 'Readings',
        citations: [{ docId: 'DOC_ELEC_042', page: 12, note: 'F3 fuse diagram' }],
        next: 'end_block'
      },
      end_block: { id: 'end_block', kind: 'end' }
    }
  };

  const result = await upsertRulePackByKey(key, pack);
  return NextResponse.json({ ok: true, action: result.action, id: result.id, key });
}
