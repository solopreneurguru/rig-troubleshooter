'use client';
import { useEffect, useState } from 'react';

type Diag = {
  envs?: Record<string, boolean>;
  tables?: Record<string, any>;
  v2Packs?: { activeV2Count?: number; error?: string|null };
};

export default function DiagBanner() {
  const [msg, setMsg] = useState<string | null>(null);
  const [v2Count, setV2Count] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function seed() {
    try {
      setSeeding(true);
      await fetch('/api/rulepacks/seed?confirm=1', { cache:'no-store' });
      location.reload();
    } finally { 
      setSeeding(false); 
    }
  }

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/diag/bigbadwolf', { cache: 'no-store' });
        if (!res.ok) return;
        const data: Diag = await res.json();
        const missingEnvs = Object.entries(data.envs ?? {}).filter(([_, v]) => !v).map(([k]) => k);
        const tableErrors = Object.entries(data.tables ?? {}).filter(([_, v]: any) => v && v.ok === false);
        const v2Count = data?.v2Packs?.activeV2Count ?? 0;
        setV2Count(v2Count);

        const parts: string[] = [];
        if (missingEnvs.length) parts.push(`Missing envs: ${missingEnvs.join(', ')}`);
        if (tableErrors.length) parts.push(`Airtable errors: ${tableErrors.map(([n, v]: any) => `${n}(${v.error || 'unknown'})`).join('; ')}`);

        if (parts.length) setMsg(parts.join(' • '));
      } catch {
        // silent
      }
    };
    run();
  }, []);

  if (!msg && (v2Count ?? 0) === 0) {
    return (
      <div className="w-full bg-amber-200 text-amber-900 text-sm px-4 py-2">
        Admin: No v2 RulePacks detected.{' '}
        <button disabled={seeding} onClick={seed} className="underline">
          {seeding ? 'Seeding…' : 'Seed v2 now'}
        </button>
      </div>
    );
  }

  if (!msg) return null;
  return (
    <div className="w-full bg-amber-200 text-amber-900 text-sm px-4 py-2">
      Admin: {msg}
    </div>
  );
}