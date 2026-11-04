import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { expectCompactEmpty } from './helpers/affiliate-empty';
import { signInAffiliate } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

const FILTERS = [
  { key: 'recorded', label: 'Đã ghi nhận', total: 21 },
  { key: 'paid', label: 'Đã chi trả', total: 31 },
  { key: 'cancelled', label: 'Đã hủy', total: 1 },
] as const;

for (const width of [1440, 390]) {
  test(`D-84 TD-P4-UI-06 commission toolbar controls keep the 32px prototype height at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    const csv = page.getByRole('button', { name: 'Xuất CSV · Tất cả', exact: true });
    await expect(csv).toBeVisible();
    await expect(csv).toBeEnabled();
    await expect(csv).toHaveCSS('height', '32px');
    await expect(csv).toHaveCSS('font-size', '13px');
    const filters = page.locator('.ant-segmented');
    await expect(filters).toHaveCSS('height', '32px');
    for (const label of await filters.locator('.ant-segmented-item-label').all())
      await expect(label).toHaveCSS('line-height', '30px');
    for (const item of await filters.locator('.ant-segmented-item').all())
      await expect(item).toHaveCSS('border-top-left-radius', '0px');
    // Every filter and its count remain reachable, not clipped away to imitate the prototype.
    for (const name of [/^Tất cả\s*53$/, /^Đã ghi nhận\s*21$/, /^Đã chi trả\s*31$/, /^Đã hủy\s*1$/])
      await expect(page.getByRole('radio', { name })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });

  test(`D-84-COM-CANCELLED TD-P4-UI-06 pager keeps size control on one line at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await page.goto(`${ADMIN_URL}/affiliate?tab=com&status=cancelled`);
    const rows = page.locator('tbody tr[data-row-key]');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Đã hủy');
    // D-110 / BR-AFF-REV: gói thực trả như prototype v4.2 (Cá nhân 1.200.000đ, DN 3.600.000đ)
    await expect(rows.first()).toContainText('300.000đ');
    const pager = page.getByRole('navigation', { name: 'Hiển thị 1–1 / 1 giao dịch' });
    const size = pager.getByRole('combobox', { name: 'Số dòng mỗi trang' });
    await expect(size).toBeVisible();
    await expect(size).toBeEnabled();
    const [nav, select] = await Promise.all([pager.boundingBox(), size.boundingBox()]);
    if (!nav || !select) throw new Error('Pager and its size control must be laid out');
    // One row: the size control sits inside the pager line instead of wrapping below it.
    expect(nav.height).toBeLessThanOrEqual(36);
    expect(select.y + select.height).toBeLessThanOrEqual(nav.y + nav.height + 0.5);
    await size.selectOption('20');
    await expect(page).toHaveURL(/[?&]size=20(?:&|$)/);
    await expect(rows).toHaveCount(1);
  });

  test(`D-84-COM-EMPTY TD-P4-UI-04 commission empty search keeps compact guidance at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    await expectCompactEmpty(page, 'Tìm thành viên hoặc affiliate...', width);
  });

  test(`D-84-COM TD-P4-UI-08 selected filter paints blue while the clock is paused at ${width}px`, async ({
    page,
    context,
  }) => {
    const time = new Date('2026-10-16T09:00:00+07:00');
    // install() runs a ticking clock; pause at the same instant can already be in the past.
    await context.clock.install({ time: new Date(time.getTime() - 60_000) });
    await context.clock.pauseAt(time);
    await page.setViewportSize({ width, height: 900 });
    await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
    const rows = page.locator('tbody tr[data-row-key]');
    await expect(rows).toHaveCount(10);
    for (const filter of FILTERS) {
      const radio = page.getByRole('radio', {
        name: new RegExp(`^${filter.label}\\s*${filter.total}$`),
      });
      const label = page.locator('.ant-segmented label').filter({ has: radio });
      await label.click();
      await expect(radio).toBeChecked();
      await expect(page).toHaveURL(new RegExp(`[?&]status=${filter.key}(?:&|$)`));
      // No clock advance: the selected state must not depend on the thumb animation finishing.
      await expect(label).toHaveCSS('background-color', 'rgb(22, 119, 255)');
      await expect(label).toHaveCSS('color', 'rgb(255, 255, 255)');
      const others = page
        .locator('.ant-segmented label')
        .filter({ has: page.getByRole('radio', { checked: false }) });
      for (const other of await others.all())
        await expect(other).not.toHaveCSS('background-color', 'rgb(22, 119, 255)');
      await expect(rows).toHaveCount(Math.min(filter.total, 10));
      for (const row of await rows.all())
        await expect(row.getByText(filter.label, { exact: true })).toBeVisible();
    }
  });
}
