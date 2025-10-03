'use client';
import { useEffect, useState } from 'react';

export default function StepRunner({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(false);
  const [node, setNode] = useState<any>(null);
  const [value, setValue] = useState<string>('');
  const [confirmed, setConfirmed] = useState(false);
  const [why, setWhy] = useState<string | null>(null);
  const [cite, setCite] = useState<any[]>([]);

  async function loadFirst() {
    setLoading(true);
    try {
      const res = await fetch('/api/plan/v2/next', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setNode(j.node); setWhy(j.why || null); setCite(j.cite || []);
      }
    } finally { setLoading(false); }
  }

  async function submitReading() {
    if (!node) return;
    setLoading(true);
    try {
      const res = await fetch('/api/plan/v2/next', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ sessionId, currentNodeId: node.id, reading: { value } })
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setNode(j.node); setWhy(j.why || null); setCite(j.cite || []);
        setValue(''); setConfirmed(false);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { loadFirst(); }, []);

  if (!node) return <div className="mb-4 text-sm text-neutral-400">Loading step…</div>;

  return (
    <div className="mb-4 rounded-xl border border-neutral-700 p-4">
      <div className="text-lg font-semibold mb-1">Step: {node.id}</div>
      {why ? <div className="text-sm text-neutral-300 mb-2">{why}</div> : null}
      <div className="text-xs bg-amber-200 text-amber-900 rounded px-3 py-2 mb-3">
        Safety: Follow LOTO, permits, OEM procedures. Do not energize or bypass interlocks unless authorized and safe.
      </div>

      {node.type === 'measure' ? (
        <>
          <div className="text-sm mb-2">
            Measure {node.unit ? `(${node.unit})` : ''} at <span className="font-mono">{node.points ?? ''}</span>
            {node.expect ? <> — expect <span className="font-mono">{node.expect}</span></> : null}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <input
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={`Enter reading ${node.unit || ''}`}
              className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm w-48"
            />
            <label className="text-xs flex items-center gap-2">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
              I confirm the area is safe and LOTO/permits are in place.
            </label>
            <button disabled={!confirmed || loading || !value}
              onClick={submitReading}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded disabled:opacity-50">
              Submit Reading
            </button>
          </div>
        </>
      ) : (
        <div className="text-sm text-neutral-300 mb-2">Info step.</div>
      )}

      {Array.isArray(cite) && cite.length ? (
        <div className="mt-3 text-xs text-neutral-400">
          Citations:{' '}
          {cite.map((c:any, i:number) => (
            <span key={i} className="mr-3">
              [{c.doc}{c.page ? ` p.${c.page}` : ''}{c.tag ? ` • ${c.tag}` : ''}]
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
