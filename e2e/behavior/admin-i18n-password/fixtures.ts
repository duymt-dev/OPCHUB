import { test as base, expect } from '@playwright/test';
import { requirePrivateNative } from '../admin-i18n/fixtures';

export { expect };
export type { Page } from '@playwright/test';
export const test = base.extend<{ publicGuard: void }>({
  publicGuard: [
    async ({ page }, use) => {
      requirePrivateNative();
      const api: string[] = [],
        errors: string[] = [];
      page.on('request', (request) => {
        const path = new URL(request.url()).pathname;
        if (path.startsWith('/v1/')) api.push(`${request.method()} ${path}`);
      });
      page.on('pageerror', () => errors.push('Public password page error'));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push('Public password console error');
      });
      await use();
      expect(
        api,
        'Public local validation must not send mail/reset/auth/business API calls',
      ).toEqual([]);
      expect(errors, 'No hydration/Intl/browser errors').toEqual([]);
    },
    { auto: true },
  ],
});
