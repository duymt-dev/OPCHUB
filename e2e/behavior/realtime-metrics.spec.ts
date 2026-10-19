import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { otherSends, otherSubmitsProject } from '../server/api';

/**
 * TIP-V2-305 — NA-24 số liệu realtime + NA-25 số đỏ chưa đọc (server: socket đẩy; MSW: làm mới
 * 3 giây khi tab hiện). Cùng assertion cho hai chế độ (D-63).
 */

async function portalLogin(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  const unread = page.waitForResponse((r) => r.url().includes('/v1/me/chat/unread') && r.ok());
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/dashboard/);
  return ((await (await unread).json()) as { total: number }).total;
}

const chatLink = (page: Page) => page.locator('aside').getByRole('link', { name: /^Chat nhóm/ });
const badgeOf = async (page: Page) => {
  const text = (await chatLink(page).textContent()) ?? '';
  return Number(/(\d+)$/.exec(text)?.[1] ?? 0);
};

test('REQ-225 NA-25 BUG-028 số đỏ menu Chat tăng khi người khác nhắn (không tải lại), về đúng khi mở chủ đề', async ({
  page,
}) => {
  const before = await portalLogin(page);
  // BUG-028: số đỏ = tổng chưa đọc thật (không còn số cứng 18)
  await expect.poll(() => badgeOf(page)).toBe(before);
  await otherSends(page, 'c1-qa', 'Câu hỏi mới 1');
  await otherSends(page, 'c1-qa', 'Câu hỏi mới 2');
  await expect.poll(() => badgeOf(page), { timeout: 6_000 }).toBe(before + 2);

  // Mở Hỏi đáp → số đỏ của chủ đề đó (≥ 2 tin vừa nhận) bị trừ hết, menu còn phần của chủ đề khác
  await chatLink(page).click();
  const qa = page.getByText('Hỏi đáp thuế & pháp lý', { exact: true });
  const row = page.locator('[role=button]').filter({ has: qa });
  const qaUnread = Number((await row.locator('[data-unread]').textContent()) ?? 0);
  expect(qaUnread).toBeGreaterThanOrEqual(2);
  await qa.click();
  await expect(page).toHaveURL(/\/chat\/c1\/qa/);
  await expect.poll(() => badgeOf(page), { timeout: 6_000 }).toBe(before + 2 - qaUnread);
});

test('REQ-224 NA-24 số đỏ menu Dự án ở Admin tăng khi có dự án chờ duyệt (không thao tác)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  const badges = page.waitForResponse((r) => r.url().includes('/v1/admin/badges') && r.ok());
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const before = ((await (await badges).json()) as { projects: number }).projects;
  const link = page.locator('aside').getByRole('link', { name: /^Dự án/ });
  const count = async () => Number(/(\d+)$/.exec((await link.textContent()) ?? '')?.[1] ?? 0);
  await expect.poll(count).toBe(before);
  await otherSubmitsProject(page);
  await expect.poll(count, { timeout: 6_000 }).toBe(before + 1);
});

test('BUG-029 Tổng quan Admin: khoảng ngày, % tăng, TV mới tháng này theo API (không số cứng)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  const res = page.waitForResponse((r) => r.url().includes('/v1/admin/overview') && r.ok());
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const o = (await (await res).json()) as {
    range: { from: string; to: string };
    newThisMonth: number;
    membersDeltaPct: number;
  };
  const dmy = (d: string) => d.split('-').reverse().join('/');
  await expect(page.getByText(`${dmy(o.range.from)} – ${dmy(o.range.to)}`)).toBeVisible();
  await expect(page.getByText('01/10/2026 – 15/10/2026')).toHaveCount(0);
  const vi = (n: number) => n.toLocaleString('vi-VN');
  await expect(page.getByText(`+${vi(o.newThisMonth)} thành viên tháng này`)).toBeVisible();
  await expect(page.getByText(`+${vi(o.membersDeltaPct)}% tháng này`)).toBeVisible();
});
