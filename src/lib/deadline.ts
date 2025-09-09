/**
 * Small helpers to bound async work and log durations.
 */
export async function withDeadline<T>(p: Promise<T>, ms: number, label = 'op'): Promise<T> {
  // AbortSignal.timeout exists in Node 18+; we still race manually to keep types simple.
  const sig = AbortSignal.timeout(ms);
  const gate = new Promise<never>((_, rej) =>
    sig.addEventListener('abort', () => rej(new Error(`deadline ${label} ${ms}ms`)))
  );
  return Promise.race([p, gate]) as Promise<T>;
}

export const since = (t0: number) => `${Date.now() - t0}ms`;

export function logStart(label: string, extra: Record<string, unknown> = {}) {
  const t0 = Date.now();
  console.log(`[api] ▶ ${label}`, { t0, ...extra });
  return () => console.log(`[api] ◀ ${label}`, { dur: since(t0), ...extra });
}