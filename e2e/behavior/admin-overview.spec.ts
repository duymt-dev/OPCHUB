import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';

/** D-89 (TIP-V4-621) — Admin Tổng quan v4: "Luồng hệ thống" đếm từ các module, bấm thẻ mở module */

interface Flow {
  paidMembers: number;
  members: number;
  stores: { published: number; hidden: number; draft: number };
  needs: { open: number; closed: number };
  projects: { pending: number; published: number };
  groups: number;
}

async function openOverview(page: Page): Promise<Flow> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  const res = page.waitForResponse((r) => r.url().includes('/v1/admin/overview') && r.ok());
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  return ((await (await res).json()) as { flow: Flow }).flow;
}

const flowCard = (page: Page, name: string) =>
  page.getByRole('region', { name: 'Luồng hệ thống' }).getByRole('link').filter({ hasText: name });

test.describe('Admin · Tổng quan v4', () => {
  test('Luồng hệ thống: 5 thẻ theo số API, nhãn Hoàn tất / Cần làm', async ({ page }) => {
    const f = await openOverview(page);
    const vi = (n: number) => n.toLocaleString('vi-VN');
    const region = page.getByRole('region', { name: 'Luồng hệ thống' });
    await expect(region.getByText('Số liệu trực tiếp từ các module')).toBeVisible();
    await expect(region.getByRole('link')).toHaveCount(5);
    await expect(flowCard(page, 'Thành viên đã đóng phí')).toContainText(
      `${vi(f.paidMembers)} / ${vi(f.members)}`,
    );
    await expect(flowCard(page, 'Gian hàng đang hiển thị')).toContainText(
      `${f.stores.hidden} đã ẩn · ${f.stores.draft} bản nháp`,
    );
    await expect(flowCard(page, 'Nhu cầu đang mở')).toContainText(`${f.needs.closed} đã đóng`);
    const projects = flowCard(page, 'Dự án chờ duyệt');
    await expect(projects).toContainText(`${f.projects.published} dự án đang hiển thị`);
    await expect(projects).toContainText(f.projects.pending > 0 ? 'Cần làm' : 'Hoàn tất');
    await expect(flowCard(page, 'Nhóm cộng đồng')).toContainText(vi(f.groups));
  });

  test('bấm "Duyệt dự án" mở tab Chờ duyệt; "Gian hàng" mở Gian hàng', async ({ page }) => {
    await openOverview(page);
    await flowCard(page, 'Dự án chờ duyệt').click();
    await expect(page).toHaveURL(/\/projects\?tab=pending$/);
    await expect(page.getByRole('tab', { name: /^Chờ duyệt/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.goBack();
    await flowCard(page, 'Gian hàng đang hiển thị').click();
    await expect(page).toHaveURL(/\/stores$/);
  });
});
