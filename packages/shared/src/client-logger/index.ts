import { sanitizeClientLog, type ClientLog } from '../api-domains/client-log';

/** One instance per application/tab; a failed logging transport never becomes a UI error. */
export function createClientLogger(app: ClientLog['app']) {
  let start = 0,
    count = 0;
  function write(scope: string, error: unknown, _context?: unknown) {
    void _context; // Context is intentionally never serialized.
    if (typeof window === 'undefined') return;
    try {
      globalThis.reportError?.(error);
    } catch {
      /* Browser reporter may be unavailable. */
    }
    const now = Date.now();
    if (now - start >= 60_000) {
      start = now;
      count = 0;
    }
    if (count >= 10) return;
    count++;
    try {
      const digest =
        error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string'
          ? error.digest
          : undefined;
      const payload = sanitizeClientLog({
        app,
        scope,
        message: '',
        name: error instanceof Error ? error.name : 'Error',
        ...(digest ? { digest } : {}),
        path: window.location.pathname,
        at: new Date(now).toISOString(),
      });
      navigator.sendBeacon?.(
        '/v1/client-logs',
        new Blob([JSON.stringify(payload)], { type: 'application/json' }),
      );
    } catch {
      /* No retries/queues: keep the tab rate limit and do not leak context. */
    }
  }
  return { error: write, warn: write };
}
