'use client';
import { useState } from 'react';
import DebugPanel from '@/components/DebugPanel';

const isProd = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';

async function jfetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, opts);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, json: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, json: { raw: text } }; }
}

export default function DevPage() {
  const [out, setOut] = useState<any>(null);
  const [token, setToken] = useState<string>("");

  async function seedPlus() {
    const headers: Record<string, string> = {};
    if (isProd) {
      const storedToken = (typeof window !== 'undefined' ? localStorage.getItem('ADMIN_DEV_TOKEN') : null) || token;
      if (!storedToken) {
        setOut({ error: "Token required in production. Set ADMIN_DEV_TOKEN first." });
        return;
      }
      headers.Authorization = `Bearer ${storedToken}`;
    } else {
      headers.Authorization = 'Bearer Cooper';
    }
    const r = await jfetch('/api/dev/seed/v2-pack-plus', { method: 'POST', headers });
    setOut({ route: '/api/dev/seed/v2-pack-plus', ...r });
  }

  async function health() {
    const r = await jfetch('/api/health');
    setOut({ route: '/api/health', ...r });
  }

  async function cleanup() {
    const r = await jfetch('/api/dev/cleanup', { method: 'POST' });
    setOut({ route: '/api/dev/cleanup', ...r });
  }


  async function runSmoke() {
    // 1) health
    let r = await jfetch('/api/health');
    if (!r.ok || !r.json?.ok) return setOut({ step: 'health', ...r });

    // 2) seed (ignore 403 if someone hits prod)
    await jfetch('/api/dev/seed/v2-pack', { method: 'POST' });
    await jfetch('/api/dev/seed/v2-pack-plus', { method: 'POST' });

    // 3) create session targeting the demo Block-15 pack
    r = await jfetch('/api/dev/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rulePackKey: 'demo.topdrive.block15.v2', problem: 'TopDrive won\'t start' })
    });
    if (!r.ok) return setOut({ step: 'createSession', ...r });
    const sessionId = r.json.sessionId;

    // 4) next -> plc_read
    r = await jfetch('/api/plan/v2/next', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }) });
    if (!r.ok) return setOut({ step: 'next#1', ...r });
    if (r.json.kind !== 'plc_read') return setOut({ step: 'next#1-kind', ...r });
    const plcStepId = r.json.id || 'plc_enable_chain';

    // 5) submit plc_read pass
    r = await jfetch('/api/plan/v2/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, stepId: plcStepId, type: 'plc_read', plcResult: '1' })
    });
    if (!r.ok) return setOut({ step: 'submit plc_read', ...r });

    // 6) next -> photo
    r = await jfetch('/api/plan/v2/next', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }) });
    if (!r.ok) return setOut({ step: 'next#2', ...r });
    if (r.json.kind !== 'photo') return setOut({ step: 'next#2-kind', ...r });
    const photoStepId = r.json.id || 'photo_panel';

    // 7) upload tiny PNG
    const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    const file = new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'smoke.png', { type: 'image/png' });
    const fd = new FormData(); fd.set('file', file);
    let up = await fetch('/api/blob/upload', { method: 'POST', body: fd });
    const upJson = await up.json().catch(() => ({}));
    if (!up.ok || !upJson?.url) return setOut({ step: 'upload', status: up.status, json: upJson });

    // 8) submit photo
    r = await jfetch('/api/plan/v2/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, stepId: photoStepId, type: 'photo', photoUrl: upJson.url })
    });
    if (!r.ok) return setOut({ step: 'submit photo', ...r });

    // 9) fetch report (only status)
    const rep = await fetch(`/api/report/${encodeURIComponent(sessionId)}`);
    setOut({ step: 'done', sessionId, reportStatus: rep.status, success: rep.ok });
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Dev Panel</h1>
      
      {isProd && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Admin Token (Production)</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Enter ADMIN_DEV_TOKEN"
              className="flex-1 px-3 py-2 border rounded bg-neutral-900 text-neutral-100"
            />
            <button
              onClick={() => {
                if (token) {
                  localStorage.setItem('ADMIN_DEV_TOKEN', token);
                  setOut({ message: "Token saved to localStorage" });
                }
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded"
            >
              Save Token
            </button>
          </div>
        </div>
      )}
      
      <DebugPanel adminToken={isProd ? ((typeof window !== 'undefined' ? localStorage.getItem('ADMIN_DEV_TOKEN') : null) || token) : undefined} />
      
      <div className="flex flex-wrap gap-2">
        <button className="rounded bg-black text-white px-3 py-2" onClick={seedPlus}>Seed v2 pack (plus)</button>
        <button className="rounded bg-black text-white px-3 py-2" onClick={health}>Check Health</button>
        <button className="rounded bg-black text-white px-3 py-2" onClick={runSmoke}>Run Smoke (Block-15)</button>
        <button
          className="px-3 py-2 rounded bg-emerald-700"
          onClick={async ()=>{
            setOut("creating demo equipment…");
            try {
              const r = await fetch("/api/equipment/instances/create", {
                method:"POST",
                headers:{ "content-type":"application/json" },
                body: JSON.stringify({ name:"DDD", rigName:"Demo Rig Alpha", typeName:"TopDrive" }),
              });
              const j = await r.json();
              setOut(JSON.stringify(j, null, 2));
            } catch(e:any) {
              setOut(String(e?.message || e));
            }
          }}
        >
          Create demo equipment (DDD on Demo Rig Alpha)
        </button>
        <button
          className="px-3 py-2 rounded bg-purple-700"
          onClick={async ()=>{
            setOut("creating demo session…");
            try {
              const headers: Record<string, string> = { "content-type": "application/json" };
              if (isProd) {
                const storedToken = (typeof window !== 'undefined' ? localStorage.getItem('ADMIN_DEV_TOKEN') : null) || token;
                if (storedToken) headers.Authorization = `Bearer ${storedToken}`;
              } else {
                headers.Authorization = 'Bearer Cooper';
              }
              const r = await fetch("/api/admin/session", {
                method:"POST",
                headers,
                body: JSON.stringify({ 
                  problem: "Admin test session", 
                  rigName: "Demo Rig Alpha",
                  equipmentName: "DDD"
                }),
              });
              const j = await r.json();
              setOut(JSON.stringify(j, null, 2));
            } catch(e:any) {
              setOut(String(e?.message || e));
            }
          }}
        >
          Create demo session (admin)
        </button>
        <button className="rounded bg-red-600 text-white px-3 py-2" onClick={cleanup}>Cleanup demo sessions</button>
      </div>
      <pre className="whitespace-pre-wrap text-sm opacity-80 border rounded p-3 bg-black/10">
        {out ? JSON.stringify(out, null, 2) : 'No output yet.'}
      </pre>
      <p className="text-xs opacity-60">
        {isProd ? "Production mode: Token required for admin actions." : "Development mode: No token required."}
      </p>
    </div>
  );
}
