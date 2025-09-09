export async function withTimeout<T>(p: Promise<T>, ms = 20000): Promise<T> {
  return new Promise<T>((res, rej) => {
    const id = setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })), ms);
    p.then(v => { clearTimeout(id); res(v); }, e => { clearTimeout(id); rej(e); });
  });
}

export const jsonOk = (data: any, init: ResponseInit = {}) => Response.json({ ok: true, ...data }, init);
export const jsonErr = (error: string, status = 500) => Response.json({ ok: false, error }, { status });