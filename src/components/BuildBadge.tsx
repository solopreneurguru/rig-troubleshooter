'use client';

export default function BuildBadge() {
  const sha =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    (typeof window !== 'undefined' ? ((window as any).__NEXT_DATA__?.buildId ?? '') : '');
  const env = process.env.NEXT_PUBLIC_APP_ENV || 'prod';
  const marker = 'FST-RIG-TS-BBW-03';
  return (
    <div className="fixed bottom-2 right-3 text-xs text-neutral-400 pointer-events-none select-none">
      build:{(sha || '').toString().slice(0,7) || 'local'}&nbsp;&nbsp;marker:{marker}&nbsp;&nbsp;env:{env}
    </div>
  );
}