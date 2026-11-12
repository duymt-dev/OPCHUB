import { isDeepStrictEqual } from 'node:util';
import { test as base, expect } from '@playwright/test';
import { requirePrivateNative } from '../admin-i18n/fixtures';

export { expect };
export interface DisabledAudit {
  expectToggle: (code: string, enabled: boolean) => void;
  settle: () => Promise<void>;
  count: () => number;
}
/** Dedicated scoped approval. Existing read-only/auth/owned-save guards stay unchanged. */
export const test = base.extend<{ audit: DisabledAudit }>({
  audit: [
    async ({ page }, use) => {
      requirePrivateNative();
      const expected: { toggle: { code: string; enabled: boolean } }[] = [];
      const errors: string[] = [],
        pending: Promise<void>[] = [];
      let toggles = 0,
        logins = 0,
        initialRefresh = 0;
      page.on('pageerror', () => errors.push('Disabled-selector page error'));
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        if (
          new URL(m.location().url || page.url()).pathname === '/v1/admin/auth/refresh' &&
          m.text() ===
            'Failed to load resource: the server responded with a status of 401 (Unauthorized)'
        )
          initialRefresh++;
        else errors.push('Disabled-selector console error');
      });
      page.on('request', (r) => {
        const path = new URL(r.url()).pathname;
        if (!path.startsWith('/v1/') || ['GET', 'HEAD', 'OPTIONS'].includes(r.method())) return;
        if (r.method() === 'POST' && path === '/v1/admin/auth/refresh') return;
        if (r.method() === 'POST' && path === '/v1/admin/auth/login') {
          if ((r.postDataJSON() as { identifier?: string }).identifier !== 'admin@opchub.community')
            errors.push('Unexpected login identity');
          logins++;
          return;
        }
        if (r.method() === 'PATCH' && path === '/v1/admin/settings/languages' && expected.length) {
          if (!isDeepStrictEqual(r.postDataJSON(), expected.shift()))
            errors.push('Toggle body changed');
          toggles++;
          return;
        }
        errors.push(`Unapproved mutation ${r.method()} ${path}`);
      });
      page.on('response', (r) => {
        const path = new URL(r.url()).pathname;
        if (!path.startsWith('/v1/')) return;
        pending.push(
          (async () => {
            if (r.status() === 401 && path === '/v1/admin/auth/refresh') return;
            if (!r.ok()) errors.push(`Failed API ${r.status()} ${path}`);
            if (r.headers()['content-type']?.includes('application/json')) await r.json();
          })().catch(() => {
            errors.push(`Unreadable API ${path}`);
          }),
        );
      });
      const settle = async () => {
        await page.waitForLoadState('networkidle');
        await Promise.all(pending);
      };
      await use({
        expectToggle: (code, enabled) => {
          expected.push({ toggle: { code, enabled } });
        },
        settle,
        count: () => toggles,
      });
      await settle();
      expect(expected).toEqual([]);
      expect(logins).toBe(1);
      expect(initialRefresh).toBeLessThanOrEqual(1);
      expect(toggles).toBeGreaterThanOrEqual(1);
      expect(toggles).toBeLessThanOrEqual(2);
      expect(errors, 'No implicit writes/API/Intl/hydration errors').toEqual([]);
    },
    { auto: true },
  ],
});
