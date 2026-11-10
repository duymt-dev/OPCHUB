import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { ADMIN_URL } from '../urls';
import { csvDownload } from './helpers/csv-download';
import { adminConversionSchema } from '@opchub/shared/api-domains';
import { adminOverviewSchema } from '@opchub/shared/api-domains';

test('REQ-623 BR-475-477 conversion table matches API, CSV3 regions has BOM and mobile scroll stays contained', async ({
  page,
}) => {
  const loaded = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/admin/overview/conversion' && r.ok(),
  );
  await openOverview(page);
  const data = adminConversionSchema.parse(await (await loaded).json());
  const section = page.locator('section').filter({
    has: page.getByRole('heading', {
      name: 'Chuyển đổi miễn phí → trả phí theo vùng',
      exact: true,
    }),
  });
  await expect(section).toBeVisible();
  await expect(section.getByRole('columnheader')).toHaveCount(6);
  await expect(section.getByRole('row')).toHaveCount(5);
  for (const row of data.rows) {
    const rendered = section.getByRole('row').filter({ hasText: row.label });
    await expect(rendered).toContainText(row.directorName ?? 'Chưa bổ nhiệm');
    await expect(rendered).toContainText(`${row.ratePct}%`);
  }
  await expect(section.getByRole('row').filter({ hasText: 'Toàn quốc' })).toContainText(
    `${data.total.ratePct}%`,
  );
  const download = page.waitForEvent('download');
  await section.getByRole('button', { name: 'Xuất CSV' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('chuyen-doi-theo-vung.csv');
  const csv = await csvDownload(file);
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv.split('\n')).toHaveLength(4);
  await page.setViewportSize({ width: 390, height: 844 });
  const scroll = section.getByRole('region', { name: 'Chuyển đổi miễn phí → trả phí theo vùng' });
  expect(await scroll.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

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
  const res = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/admin/overview' && r.ok(),
  );
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  return ((await (await res).json()) as { flow: Flow }).flow;
}

const flowCard = (page: Page, name: string) =>
  page.getByRole('region', { name: 'Luồng hệ thống' }).getByRole('link').filter({ hasText: name });

test('REQ-122 overview range and periods preserve independent monthly sparklines', async ({
  page,
}) => {
  await openOverview(page);
  await page.locator('.ant-picker-range input').first().click();
  for (const preset of ['Hôm nay', '7 ngày qua', '30 ngày qua', 'Tháng này', 'Tháng trước']) {
    await expect(page.getByText(preset, { exact: true })).toBeVisible();
  }
  const changed = page.waitForResponse((r) => {
    const url = new URL(r.url());
    return url.pathname === '/v1/admin/overview' && url.searchParams.has('from') && r.ok();
  });
  await page.getByText('30 ngày qua', { exact: true }).click();
  const data = adminOverviewSchema.parse(await (await changed).json());
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('from') === data.range.from &&
      url.searchParams.get('to') === data.range.to,
  );
  await expect(page.getByText('Thành viên mới', { exact: true }).locator('..')).toContainText(
    data.newThisMonth.toLocaleString('vi-VN'),
  );
  const sparks = page.locator('main svg[viewBox="0 0 52 22"] polyline');
  const points = await sparks.evaluateAll((els) => els.map((e) => e.getAttribute('points')));
  for (const [name, period, count] of [
    ['Tuần', 'week', 7],
    ['Năm', 'year', 5],
  ] as const) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('[data-m="bars"] > div')).toHaveCount(count);
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get('period') === period &&
        url.searchParams.get('from') === data.range.from &&
        url.searchParams.get('to') === data.range.to,
    );
    expect(await sparks.evaluateAll((els) => els.map((e) => e.getAttribute('points')))).toEqual(
      points,
    );
  }
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Năm', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('[data-m="bars"] > div')).toHaveCount(5);
});

test('REQ-122 D-140 historical range changes cohorts, not live totals or flow', async ({
  page,
}) => {
  const initial = await openOverview(page);
  const loaded = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/admin/overview' && r.ok(),
  );
  await page.goto(`${ADMIN_URL}/overview?from=1800-01-01&to=1800-01-01`);
  const data = adminOverviewSchema.parse(await (await loaded).json());
  expect(data.newThisMonth).toBe(0);
  expect(data.paid.newThisMonth).toBe(0);
  expect(data.flow).toEqual(initial);
  await expect(page.getByText('Thành viên mới', { exact: true }).locator('..')).toContainText('0');
  await expect(page.getByText('Trong khoảng đã chọn', { exact: true })).toBeVisible();
});

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
