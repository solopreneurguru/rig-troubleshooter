/**
 * Utility to race a promise with a timeout, returning clear error on deadline.
 * Default timeout is 4000ms, suitable for most Airtable operations.
 */
export async function withDeadline<T>(
  promise: Promise<T>, 
  ms: number = 4000, 
  label: string = 'operation'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`deadline ${label} ${ms}ms`)), ms);
  });
  
  return Promise.race([promise, timeout]);
}

/**
 * Log start of operation with timing info for debugging.
 */
export function logStart(label: string, extra: Record<string, unknown> = {}) {
  console.log(`[${new Date().toISOString()}] START ${label}`, extra);
}
