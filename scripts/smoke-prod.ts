import assert from 'node:assert';

const BASE = process.env.SMOKE_BASE || 'https://rig-troubleshooter.vercel.app';
const paths = [
  '/api/health',
  '/api/diag/bigbadwolf',
  '/api/equipment/instances',
  // add more if needed: '/api/rulepacks/list'
];

async function check(path: string) {
  const res = await fetch(BASE + path, { cache: 'no-store' });
  const ok = res.ok;
  let body: any = null;
  try { body = await res.json(); } catch {}
  console.log(`[${ok ? 'OK' : 'ERR'}] ${path} -> ${res.status}`);
  if (!ok) console.log(body || 'no body');
  return ok;
}

(async () => {
  console.log(`Smoking ${BASE} ...`);
  let all = true;
  for (const p of paths) {
    const ok = await check(p);
    all = all && ok;
  }
  assert(all, 'Some smoke checks failed');
  console.log('Smoke passed.');
})().catch(e => {
  console.error('Smoke failed:', e?.message || e);
  process.exit(1);
});
