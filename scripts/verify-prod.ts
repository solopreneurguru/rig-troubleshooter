const BASE = process.env.SMOKE_BASE || 'https://rig-troubleshooter.vercel.app';
const paths = [
  '/api/routes',
  '/api/bigbadwolf',
  '/api/env/echo',
  '/api/equipment/instances',
  '/api/equipment/instances/debug'
];

async function hit(p: string) {
  try {
    const res = await fetch(BASE + p, { cache: 'no-store' });
    const text = await res.text();
    console.log(`${res.ok ? 'OK ' : 'ERR'} ${res.status}  ${p}`);
    console.log(text.slice(0, 300) + (text.length > 300 ? '…' : ''));
    console.log('---');
  } catch (e: any) {
    console.log(`ERR ???  ${p}`);
    console.log(String(e?.message ?? e));
    console.log('---');
  }
}

(async () => {
  console.log('Verifying', BASE);
  for (const p of paths) await hit(p);
})();
