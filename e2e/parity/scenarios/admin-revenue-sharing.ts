import { expect } from '@playwright/test';
import { nav, tap, tick, type, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

async function sharing(c: StepCtx) {
  await nav(c, 'Mạng lưới Affiliate');
  if (c.side === 'app') await c.page.getByRole('tab', { name: /^GĐ Vùng/ }).click();
  else await tap(c, 'GĐ Vùng');
  await waitText(c, 'Tổng phần GĐ Vùng');
  await waitText(c, 'Trần Quốc Bảo');
  await c.page.waitForLoadState('networkidle');
}

async function search(c: StepCtx, query: string) {
  await sharing(c);
  await type(c, 'Tìm GĐ Vùng hoặc vùng...', query);
  await tick(c, 400); // Run the existing300ms URL debounce, never change its timeout.
  await c.page.waitForLoadState('networkidle');
  await expect(
    c.page.getByText('Trần Quốc Bảo', { exact: true }).filter({ visible: true }),
  ).toHaveCount(0);
  await expect(
    c.page.getByText('Phạm Thu Hà', { exact: true }).filter({ visible: true }),
  ).toHaveCount(0);
}

const scenario = (id: string, name: string, steps: NonNullable<Scenario['steps']>): Scenario => ({
  id,
  name,
  demo: 'affiliate',
  start: 'admin',
  fullPage: true,
  steps,
});

/** Default AF0 dataset, not the optional functional receipt fixture used by behavior tests. */
export const ADMIN_REVENUE_SHARING: Scenario[] = [
  scenario('D-V46-GDV-SHARING', 'GĐ Vùng · sổ chia sẻ mặc định', sharing),
  scenario('D-V46-GDV-DETAIL', 'GĐ Vùng · khoản ghi nhận và lịch sử Bảo', async (c) => {
    await sharing(c);
    await tap(c, 'Trần Quốc Bảo');
    await waitText(c, 'Khoản ghi nhận cho GĐ Vùng');
    await waitText(c, 'Lịch sử chi trả');
    await c.page.waitForLoadState('networkidle');
  }),
  scenario('D-V46-GDV-SEARCH', 'GĐ Vùng · tìm Miền Trung', async (c) => {
    await search(c, 'Miền Trung');
    await waitText(c, 'Lê Minh Hải');
  }),
  scenario('D-V46-GDV-EMPTY', 'GĐ Vùng · tìm không có kết quả', async (c) => {
    await search(c, 'ZZZ-NO-DIRECTOR');
    await expect(
      c.page.getByText('Lê Minh Hải', { exact: true }).filter({ visible: true }),
    ).toHaveCount(0);
  }),
  scenario('D-V46-GDV-PAYOUT', 'GĐ Vùng · sau khi bấm Chi trả của Bảo', async (c) => {
    await sharing(c);
    await c.page.getByRole('button', { name: 'Chi trả', exact: true }).first().click();
    // Complete the real enter animation on both sides before freeze CSS is applied.
    await c.page.clock.runFor(350);
    // Q-V46-802-2: capture the real divergence, not an artificially aligned payout.
    if (c.side === 'app') {
      const dialog = c.page.getByRole('dialog', { name: 'Chi trả GĐ Vùng', exact: true });
      await dialog.getByRole('combobox', { name: 'Kỳ chi', exact: true }).waitFor();
      await expect(dialog).toContainText('TRAN QUOC BAO');
      await expect(dialog).toHaveCSS('opacity', '1');
    } else await waitText(c, /Đã chi trả .+ cho GĐ Vùng Trần Quốc Bảo/);
  }),
];
