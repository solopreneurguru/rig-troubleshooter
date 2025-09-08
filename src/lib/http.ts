export async function withTimeout<T>(p: Promise<T>, ms=15000, onAbort?:()=>void): Promise<T> {
  const to = new Promise<never>((_, rej) => {
    const id = setTimeout(() => {
      onAbort?.();
      const e = new Error('timeout');
      (e as any).code = 'ETIMEDOUT';
      rej(e);
    }, ms);
    // clear in finally
    p.finally(()=>clearTimeout(id));
  });
  return Promise.race([p, to]) as Promise<T>;
}

export function jsonOk(data: any, init: ResponseInit = {}) {
  return Response.json({ ok: true, ...data }, init);
}

export function jsonErr(error: string, status = 500) {
  return Response.json({ ok: false, error }, { status });
}

// Client-side timeout helper
export function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}
