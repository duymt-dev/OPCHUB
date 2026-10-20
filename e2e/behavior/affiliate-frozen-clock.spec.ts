import { test, expect } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

test('MSW-404-06 REQ-312 mock relay starts after hydration with the parity clock paused', async ({
  page,
  context,
}) => {
  const time = new Date('2026-10-16T09:00:00+07:00');
  // install() runs a ticking clock; pause at the same instant can already be in the past.
  await context.clock.install({ time: new Date(time.getTime() - 60_000) });
  await context.clock.pauseAt(time);
  await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  const commission = page.getByRole('row').filter({ hasText: 'Kiều Văn Sơn' });
  await expect(commission).toHaveCount(1);
  await expect(commission).toContainText('150.000đ');
  await page.reload();
  await expect(commission).toHaveCount(1);
  const portal = await context.newPage();
  await signInAffiliate(portal, PORTAL_URL, 'ha.le@opcmedia.vn', 'User@2026');
  await expect(portal.getByText('HAOPC', { exact: true })).toBeVisible();
  await portal.reload();
  await expect(portal.getByText('HAOPC', { exact: true })).toBeVisible();
});
