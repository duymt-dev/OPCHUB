import type { Page } from '@playwright/test';
import { bytes } from './flight';

export function observeAssets(page: Page) {
  const pending: Promise<void>[] = [];
  const resources = new Map<
    string,
    { kind: string; bytes: number; gzip: number; sha256: string }
  >();
  const errors: string[] = [];
  const failures: string[] = [];
  const writes: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (
      path.startsWith('/v1/') &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
      !(request.method() === 'POST' && path === '/v1/admin/auth/refresh')
    )
      writes.push(`${request.method()} ${path}`);
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    const path = url.pathname;
    if (url.origin !== new URL(page.url()).origin) return;
    if (!response.ok()) failures.push(`${response.status()} ${path}`);
    const kind = path.endsWith('.js')
      ? 'js'
      : path.endsWith('.css')
        ? 'css'
        : /\.(?:woff2?|ttf|otf)$/.test(path)
          ? 'font'
          : undefined;
    if (!kind) return;
    const check = (async () => {
      if (!response.ok()) throw new Error(`Asset failed: ${response.status()} ${path}`);
      resources.set(path, { kind, ...bytes(await response.body()) });
    })();
    void check.catch(() => undefined);
    pending.push(check);
  });
  return async () => {
    await Promise.all(pending);
    const assets = [...resources]
      .map(([path, data]) => ({ path, ...data }))
      .sort((a, b) => a.path.localeCompare(b.path));
    const sum = (kind: string, key: 'bytes' | 'gzip') =>
      assets.filter((a) => a.kind === kind).reduce((n, a) => n + a[key], 0);
    return {
      assets,
      errors,
      failures,
      writes,
      totals: {
        jsBytes: sum('js', 'bytes'),
        jsGzip: sum('js', 'gzip'),
        cssBytes: sum('css', 'bytes'),
        cssGzip: sum('css', 'gzip'),
        fontBytes: sum('font', 'bytes'),
      },
    };
  };
}
