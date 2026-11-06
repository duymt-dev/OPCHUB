import { nav, resetScroll, tap, tick, type, waitText } from '../steps';
import type { StepCtx } from '../types';

export async function openAffiliate(c: StepCtx) {
  await nav(c, 'Mạng lưới Affiliate');
  await c.page.waitForLoadState('networkidle');
  await tick(c, 1000);
  await c.page
    .getByPlaceholder('Tìm thành viên hoặc affiliate...', { exact: true })
    .waitFor({ state: 'visible' });
}

export async function affiliateTab(c: StepCtx, label: 'Affiliate' | 'Chính sách') {
  const tab =
    c.side === 'app'
      ? c.page.getByRole('tab', { name: new RegExp(`^${label}`) })
      : c.page
          .locator('[data-screen-label="Admin · Affiliate"]')
          .getByText(label, { exact: true })
          .filter({ visible: true })
          .first();
  await tab.click();
  await c.page.waitForLoadState('networkidle');
  await tick(c, 1000);
  if (label === 'Affiliate') {
    // networkidle does not guarantee the query's rendered rows under a paused clock.
    const row =
      c.side === 'app'
        ? c.page.locator('tbody tr[data-row-key]').first()
        : c.page
            .locator('[data-m="tbl"] div[style*="min-height: 60px"]')
            .filter({ visible: true })
            .first();
    await row.waitFor({ state: 'visible' });
  }
}

export async function affiliateDetail(c: StepCtx) {
  await openAffiliate(c);
  await affiliateTab(c, 'Affiliate');
  await type(c, 'Tìm tên, mã giới thiệu, email...', 'HAOPC');
  await tick(c, 400);
  await waitText(c, 'Lê Thu Hà');
  await tap(c, 'Lê Thu Hà');
  await c.page.waitForLoadState('networkidle');
  await tick(c, 1000);
  await waitText(c, c.side === 'app' ? 'Đối soát & chi trả theo tháng' : 'Đối soát theo tháng');
  await resetScroll(c);
}
