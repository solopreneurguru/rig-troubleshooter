'use client';
export default function BuildBadge() {
  const sha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || (typeof window !== 'undefined' ? (window as any).__NEXT_DATA__?.buildId : '');
  const env = process.env.NEXT_PUBLIC_APP_ENV || 'prod';
  const marker = 'FST-RIG-TS-BBW-02';
  return (
    <div className="fixed bottom-2 right-3 text-xs text-neutral-400">
      build:{sha?.slice(0,7) || 'local'}  marker:{marker}  env:{env}
    </div>
  );
}
