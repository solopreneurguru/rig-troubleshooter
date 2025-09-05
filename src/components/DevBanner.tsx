'use client';
import { useEffect, useState } from 'react';
const ENV = process.env.NEXT_PUBLIC_VERCEL_ENV; // set to 'production' on prod

export default function DevBanner() {
  const [v2, setV2] = useState<number | null>(null);
  if (ENV !== 'production') return null;

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/health', { cache: 'no-store' });
        const j = await r.json();
        setV2(j?.rulepacks?.v2 ?? null);
      } catch {
        setV2(null);
      }
    })();
  }, []);

  return (
    <div className="w-full bg-yellow-500/10 border-b border-yellow-500/40 text-yellow-100">
      <div className="mx-auto max-w-6xl px-3 py-2 text-sm">
        Admin: v2 packs = {v2 ?? 0}. (This banner is visible only on production.)
      </div>
    </div>
  );
}
