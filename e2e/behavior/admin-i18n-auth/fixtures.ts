import { test as base, expect } from '@playwright/test';
import { requirePrivateNative } from '../admin-i18n/fixtures';
import { AuthProtocol } from './protocol';

export { expect };
export type { Page } from '@playwright/test';
export interface AuthAudit {
  protocol: AuthProtocol;
  settle: () => Promise<void>;
}
export const test = base.extend<{ audit: AuthAudit }>({
  audit: [
    async ({ page }, use) => {
      requirePrivateNative();
      const protocol = new AuthProtocol();
      const pending: Promise<void>[] = [];
      const browserErrors: string[] = [];
      const console401: string[] = [];
      page.on('pageerror', () => browserErrors.push('Browser page error'));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const path = new URL(message.location().url || page.url()).pathname;
        if (
          message.text() ===
            'Failed to load resource: the server responded with a status of 401 (Unauthorized)' &&
          ['/v1/admin/auth/login', '/v1/admin/auth/refresh'].includes(path)
        )
          console401.push(path);
        else browserErrors.push(`Browser console error at ${path}`);
      });
      page.on('request', (request) => {
        const path = new URL(request.url()).pathname;
        if (!path.startsWith('/v1/')) return;
        let body: unknown = null;
        try {
          if (request.postData()) body = request.postDataJSON() as unknown;
        } catch {
          protocol.errors.push('Non-JSON mutation body');
        }
        if (path === '/v1/admin/auth/totp/verify' && request.method() === 'POST')
          protocol.verifyRequest(body);
        else protocol.request(request.method(), path, body);
      });
      page.on('response', (response) => {
        const path = new URL(response.url()).pathname;
        if (!path.startsWith('/v1/')) return;
        const task = (async () => {
          let body: unknown = null;
          if (response.headers()['content-type']?.includes('application/json'))
            body = (await response.json()) as unknown;
          protocol.response(path, response.status(), body);
        })().catch(() => {
          protocol.errors.push(`Unreadable API response at ${path}`);
        });
        pending.push(task);
      });
      const settle = async () => {
        await Promise.all(pending);
      };
      await use({ protocol, settle });
      await settle();
      expect(
        protocol.errors,
        'Exact prefix/principal-bound auth protocol, no business writes',
      ).toEqual([]);
      expect(browserErrors, 'No hydration/Intl/browser errors').toEqual([]);
      expect(console401.filter((p) => p.endsWith('/login')).length).toBeLessThanOrEqual(1);
      expect(console401.filter((p) => p.endsWith('/refresh')).length).toBeLessThanOrEqual(1);
      for (const [key, count] of Object.entries({
        'admin-accounts': 1,
        'auth/login': 3,
        'auth/logout': 2,
        'auth/first-password': 1,
        'auth/2fa/setup': 1,
        'auth/2fa/enable': 1,
        'auth/totp/verify': 1,
        challenge: 1,
      }))
        expect(protocol.counts.get(key), `Exact auth flow count: ${key}`).toBe(count);
    },
    { auto: true },
  ],
});
