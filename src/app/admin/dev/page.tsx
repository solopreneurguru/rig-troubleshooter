'use client';

import { useState } from 'react';

const isProd = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';

export default function DevPage() {
  if (isProd) {
    return <div className="p-6">Disabled in production.</div>;
  }
  const [out, setOut] = useState<any>(null);

  async function seedPlus() {
    const res = await fetch('/api/dev/seed/v2-pack-plus', { method: 'POST' });
    const j = await res.json().catch(() => ({}));
    setOut({ route: '/api/dev/seed/v2-pack-plus', status: res.status, json: j });
  }

  async function health() {
    const res = await fetch('/api/health');
    const j = await res.json().catch(() => ({}));
    setOut({ route: '/api/health', status: res.status, json: j });
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Dev Panel</h1>
      <div className="flex gap-2">
        <button className="rounded bg-black text-white px-3 py-2" onClick={seedPlus}>Seed v2-pack-plus</button>
        <button className="rounded bg-black text-white px-3 py-2" onClick={health}>Check Health</button>
      </div>
      <pre className="whitespace-pre-wrap text-sm opacity-80 border rounded p-3 bg-black/10">
        {out ? JSON.stringify(out, null, 2) : 'No output yet.'}
      </pre>
      <p className="text-xs opacity-60">This page is disabled in production.</p>
    </div>
  );
}
