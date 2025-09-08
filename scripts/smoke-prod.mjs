/* eslint-disable no-console */
const APP = process.env.APP || 'https://rig-troubleshooter.vercel.app';
const TOKEN = process.env.ADMIN_DEV_TOKEN || '';

async function jfetch(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (TOKEN && !headers['x-admin-token']) headers['x-admin-token'] = TOKEN;
  const res = await fetch(APP + path, { ...opts, headers });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

function tinyPng() {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
  return Buffer.from(b64, 'base64');
}

(async () => {
  console.log('APP =', APP);

  // 1) Health
  let r = await jfetch('/api/health');
  console.log('health:', r.status, r.json);
  if (!r.ok || !r.json?.ok) throw new Error('Health failed');

  // 2) If v2==0, seed once (admin only)
  if ((r.json.rulepacks?.v2 ?? 0) === 0) {
    const s = await jfetch('/api/dev/seed/v2-pack-plus', { method: 'POST' });
    console.log('seed v2-pack-plus:', s.status, s.json);
    if (!s.ok) throw new Error('Seed failed');
    r = await jfetch('/api/health');
    console.log('health (after seed):', r.status, r.json);
    if ((r.json.rulepacks?.v2 ?? 0) === 0) throw new Error('v2 still 0 after seed');
  }

  // 3) Create admin session targeting demo v2
  const cs = await jfetch('/api/admin/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ problem: 'TopDrive won't start', rulePackKey: 'demo.topdrive.block15.v2' })
  });
  console.log('create session:', cs.status, cs.json);
  if (!cs.ok) throw new Error('create session failed');
  const sessionId = cs.json.sessionId;

  // 4) Next -> plc_read
  let step = await jfetch('/api/plan/v2/next', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  console.log('next #1:', step.status, step.json);
  if (!step.ok || step.json.kind !== 'plc_read') throw new Error('expected plc_read');

  // 5) Submit plc_read pass
  const sub1 = await jfetch('/api/plan/v2/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId, stepId: step.json.id || 'plc_enable_chain', type: 'plc_read', plcResult: '1' })
  });
  console.log('submit plc_read:', sub1.status, sub1.json);
  if (!sub1.ok) throw new Error('submit plc_read failed');

  // 6) Next -> photo
  step = await jfetch('/api/plan/v2/next', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  console.log('next #2:', step.status, step.json);
  if (!step.ok || step.json.kind !== 'photo') throw new Error('expected photo');

  // 7) Upload tiny PNG to Blob
  const fd = new FormData();
  fd.set('file', new Blob([tinyPng()], { type: 'image/png' }), 'smoke.png');
  const up = await fetch(APP + '/api/blob/upload', { method: 'POST', body: fd });
  const upJson = await up.json().catch(() => ({}));
  console.log('upload:', up.status, upJson);
  if (!up.ok || !upJson?.url) throw new Error('upload failed');

  // 8) Submit photo
  const sub2 = await jfetch('/api/plan/v2/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId, stepId: step.json.id || 'photo_panel', type: 'photo', photoUrl: upJson.url })
  });
  console.log('submit photo:', sub2.status, sub2.json);
  if (!sub2.ok) throw new Error('submit photo failed');

  // 9) Report
  const rep = await fetch(`${APP}/api/report/${encodeURIComponent(sessionId)}`);
  console.log('report:', rep.status, rep.headers.get('content-type'));
  if (!rep.ok) throw new Error('report failed');

  console.log('PROD SMOKE PASS ✅');
})().catch((e) => {
  console.error('PROD SMOKE FAIL ❌', e?.message || e);
  process.exit(1);
});
