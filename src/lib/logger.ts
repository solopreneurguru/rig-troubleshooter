export function logServer(event: string, data: Record<string, unknown> = {}) {
  try {
    console.log(JSON.stringify({ _ts: new Date().toISOString(), event, ...data }));
  } catch { /* no-op */ }
}
