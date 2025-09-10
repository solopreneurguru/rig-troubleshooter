const https = await import('node:https');

const BASE = process.env.SMOKE_BASE || 'https://rig-troubleshooter.vercel.app';
const TARGETS = [
  ['/api/diag/ping',      'node-ping'],
  ['/api/diag/ping-edge', 'edge-ping'],
  ['/api/health-lite',    'health-lite'],
];

function get(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const id = res.headers['x-vercel-id'] || res.headers['X-Vercel-Id'];
        resolve({ status: res.statusCode, xVercelId: id, body: data.slice(0, 200) });
      });
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', (err) => resolve({ status: 0, error: String(err.message || err) }));
  });
}

const out = {};
for (const [p, name] of TARGETS) {
  // eslint-disable-next-line no-await-in-loop
  out[name] = await get(`${BASE}${p}`);
}
console.log(JSON.stringify({ base: BASE, out }, null, 2));
