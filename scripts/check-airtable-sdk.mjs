// scripts/check-airtable-sdk.mjs
import Airtable from 'airtable';
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, TB_RIGS } = process.env;
const timeout = (ms, tag) => new Promise((_, r)=>setTimeout(()=>r(new Error('deadline '+tag+' '+ms+'ms')), ms));
try {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !TB_RIGS) throw new Error('env missing');
  const base = new Airtable({ apiKey: AIRTABLE_API_KEY, requestTimeout: 8000 }).base(AIRTABLE_BASE_ID);
  const p = base(TB_RIGS).select({ fields:['Name'], pageSize:5 }).firstPage().then(rows=>{
    const names = rows.map(r=>r.get('Name')||'').filter(Boolean);
    console.log(JSON.stringify({ ok:true, count:names.length, names }, null, 2));
  }).catch(e=>console.log(JSON.stringify({ ok:false, where:'rigs', error:String(e) })));
  await Promise.race([p, timeout(8000,'sdk.rigs')]);
} catch (e) {
  console.log(JSON.stringify({ ok:false, error:String(e) }));
}
