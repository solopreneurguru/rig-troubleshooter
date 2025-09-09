// scripts/whoami.mjs
const token = process.env.AIRTABLE_API_KEY;
const ctl = AbortController.prototype.hasOwnProperty('timeout') ? AbortSignal.timeout(5000) : undefined;
const res = await fetch('https://api.airtable.com/v0/meta/whoami', {
  headers: { Authorization: `Bearer ${token}` },
  signal: ctl
}).catch(e=>({ error:String(e) }));
if (res?.json) {
  const j = await res.json().catch(()=>null);
  console.log(JSON.stringify({ status:res.status, ok:res.ok, body:j }, null, 2));
} else {
  console.log(JSON.stringify({ ok:false, error:res?.error||'fetch failed' }, null, 2));
}
