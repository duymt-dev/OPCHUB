import { test as base, expect } from '@playwright/test';
import { requirePrivateNative } from '../admin-i18n/fixtures';
import { ValuesProtocol } from './protocol';

export { expect };
export type { Page } from '@playwright/test';
export interface ValuesAudit {
  protocol: ValuesProtocol;
  settle: () => Promise<void>;
  mark: (phase: string) => void;
}
export const test = base.extend<{ audit: ValuesAudit }>({
  audit: [
    async ({ page }, use, info) => {
      requirePrivateNative();
      const protocol = new ValuesProtocol(),
        pending: Promise<void>[] = [],
        errors: string[] = [];
      let refreshErrors = 0;
      let phase = 'initial';
      const pendingPaths = new Set<string>();
      page.on('pageerror', () => errors.push('Canonical browser page error'));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        if (
          new URL(message.location().url || page.url()).pathname === '/v1/admin/auth/refresh' &&
          message.text() ===
            'Failed to load resource: the server responded with a status of 401 (Unauthorized)'
        )
          refreshErrors++;
        else errors.push('Canonical browser console error');
      });
      page.on('request', (r) => {
        const path = new URL(r.url()).pathname;
        if (!path.startsWith('/v1/')) return;
        let body: unknown = null;
        try {
          if (r.postData()) body = r.postDataJSON() as unknown;
        } catch {
          protocol.errors.push('Non-JSON canonical mutation');
        }
        protocol.request(r.method(), path, body);
      });
      page.on('response', (r) => {
        const path = new URL(r.url()).pathname;
        if (!path.startsWith('/v1/')) return;
        pendingPaths.add(path);
        const task = (async () => {
          const body: unknown = r.headers()['content-type']?.includes('application/json')
            ? await r.json()
            : null;
          protocol.response(r.request().method(), path, r.status(), body);
        })()
          .catch(() => {
            protocol.errors.push(`Unreadable canonical API response ${path}`);
          })
          .finally(() => pendingPaths.delete(path));
        pending.push(task);
      });
      const settle = async () => {
        await page.waitForLoadState('networkidle');
        await Promise.all(pending);
      };
      await use({
        protocol,
        settle,
        mark: (next) => {
          phase = next;
        },
      });
      if (info.status !== info.expectedStatus)
        await info.attach('canonical-phase-no-credentials', {
          body: JSON.stringify({ phase, pendingPaths: [...pendingPaths] }),
          contentType: 'application/json',
        });
      await settle();
      expect(
        protocol.errors,
        'Only exact prefix-owned writes and unchanged canonical DTOs',
      ).toEqual([]);
      expect(protocol.logins).toBe(1);
      expect(protocol.expected.length, 'Two owned creates plus eight actual UI saves').toBe(10);
      expect(protocol.expected.every((e) => e.seen && e.done)).toBe(true);
      expect(errors, 'No hydration/Intl/browser errors').toEqual([]);
      expect(refreshErrors).toBeLessThanOrEqual(1);
    },
    { auto: true },
  ],
});
