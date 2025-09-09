import Airtable from 'airtable';
import { withDeadline } from './deadline';

function getBase() {
  const API_KEY = process.env.AIRTABLE_API_KEY!;
  const BASE_ID = process.env.AIRTABLE_BASE_ID!;
  if (!API_KEY || !BASE_ID) throw new Error('Airtable env missing');
  
  return new Airtable({
    apiKey: API_KEY,
    endpointUrl: 'https://api.airtable.com',
    requestTimeout: 8000, // SDK's own timeout (we'll also guard with withDeadline)
  }).base(BASE_ID);
}

// ---- Helpers that ONLY use the SDK (no REST bypass) ----

export async function rigsFirstPage() {
  const base = getBase();
  const table = process.env.TB_RIGS!;
  const sel = base(table).select({
    fields: ['Name'],
    pageSize: 50,
    sort: [{ field: 'Name', direction: 'asc' }],
  });
  const rows = await withDeadline(sel.firstPage(), 8000, 'rigs.firstPage');
  return rows.map(r => ({ id: r.id, name: (r.get('Name') as string) || '' })).filter(r => r.name);
}

export async function findRecordIdByName(tableId: string, name: string) {
  const base = getBase();
  const safe = String(name ?? '').replace(/'/g, "\\'");
  const formula = `LOWER({Name}) = LOWER('${safe}')`;
  const sel = base(tableId).select({ filterByFormula: formula, fields: ['Name'], pageSize: 1 });
  const rows = await withDeadline(sel.firstPage(), 8000, 'find.byName');
  return rows[0]?.id as string | undefined;
}

export async function createEquipmentViaSdk(opts: {
  name: string;
  rigName?: string;
  typeName?: string;
  serial?: string;
  plcDocUrl?: string;
}) {
  const base = getBase();
  const table = process.env.TB_EQUIPMENT_INSTANCES!;
  const fields: any = { Name: opts.name };

  if (opts.rigName) {
    const rigId = await findRecordIdByName(process.env.TB_RIGS!, opts.rigName);
    if (rigId) fields.Rig = [rigId];
  }
  if (opts.typeName) {
    const typeId = await findRecordIdByName(process.env.TB_EQUIPMENT_TYPES!, opts.typeName);
    if (typeId) fields.Type = [typeId];
  }
  if (opts.serial) fields.Serial = opts.serial;
  if (opts.plcDocUrl) fields.PLCProjectDoc = opts.plcDocUrl;

  const res = await withDeadline(
    base(table).create([{ fields }], { typecast: true }),
    8000,
    'equip.create'
  );
  return res?.[0]?.id as string | undefined;
}

export async function createSessionViaSdk(fields: Record<string, any>) {
  const base = getBase();
  const table = process.env.TB_SESSIONS!;
  const res = await withDeadline(
    base(table).create([{ fields }], { typecast: true }),
    9000,
    'session.create'
  );
  const rec = res?.[0];
  if (!rec?.id) throw new Error('session create failed');
  return rec.id as string;
}
