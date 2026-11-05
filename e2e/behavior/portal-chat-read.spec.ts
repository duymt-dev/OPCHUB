import { test, expect } from '../server/test';
import { PORTAL_URL } from '../urls';

test('REQ-622 TC-461 switch rooms ten times: one read per unread room, no stale-poll loop', async ({
  page,
}) => {
  const reads: string[] = [];
  page.on('request', (r) => {
    const path = new URL(r.url()).pathname;
    if (r.method() === 'POST' && /\/rooms\/[^/]+\/read$/.test(path)) reads.push(path);
  });
  await page.goto(`${PORTAL_URL}/login`);
  await page
    .locator('input[autocomplete=username],input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.locator('aside').getByText('Chat nhóm', { exact: true }).click();
  await expect(page.getByText('Enter để gửi')).toBeVisible();
  const qa = page
    .getByRole('button')
    .filter({ has: page.getByText('Hỏi đáp thuế & pháp lý', { exact: true }) });
  const events = page
    .getByRole('button')
    .filter({ has: page.getByText('Cà phê cuối tuần', { exact: true }) });
  for (let i = 0; i < 10; i++) {
    await (i % 2 ? events : qa).click();
    await expect(page.getByPlaceholder(/^Nhắn tin trong #/)).toHaveAttribute(
      'placeholder',
      i % 2 ? 'Nhắn tin trong #Cà phê cuối tuần...' : 'Nhắn tin trong #Hỏi đáp thuế & pháp lý...',
    );
    await expect
      .poll(() => reads.filter((p) => p === `/v1/rooms/c1-${i % 2 ? 'events' : 'qa'}/read`).length)
      .toBe(1);
  }
  // Exercise an actual unread refetch after both cursors were committed, without reload/remount.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(qa.locator('[data-unread]')).toHaveCount(0);
  await expect(events.locator('[data-unread]')).toHaveCount(0);
  expect(reads).toHaveLength(2);
});
