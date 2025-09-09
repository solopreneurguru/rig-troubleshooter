export async function withDeadline<T>(
  p: Promise<T>,
  ms: number,
  label = 'op'
): Promise<T> {
  const ctrl = AbortSignal.timeout(ms);
  // Let caller pass in fetch signals if needed; this is a hard cap.
  const hardCap = new Promise<never>((_, rej) =>
    ctrl.addEventListener('abort', () =>
      rej(new Error(`deadline(${label}) ${ms}ms`))
    )
  );
  return Promise.race([p, hardCap]) as Promise<T>;
}

export function since(t0: number) { return `${Date.now() - t0}ms`; }

export function logStart(label: string, extra: Record<string, unknown> = {}) {
  const t0 = Date.now();
  console.log(`[api] ▶ ${label}`, { ...extra, t0 });
  return () => console.log(`[api] ◀ ${label}`, { dur: since(t0), ...extra });
}
