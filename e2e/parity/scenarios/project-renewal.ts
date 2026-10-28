import { expect } from '@playwright/test';
import { PORTAL_URL } from '../../urls';
import { ACCOUNTS, nav, tap, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';
import { row } from './admin-members';
import { PORTAL_PROJECTS } from './portal-projects';

/** Same real UI action on each side; retain the original default scenarios and their raw diffs. */
async function renewOwner(c: StepCtx) {
  await nav(c, 'Phí thành viên');
  await waitText(c, 'Phí thành viên hệ thống');
  const yen =
    c.side === 'app'
      ? c.page.locator('[data-m="tbl"]').getByRole('row').filter({ hasText: 'Đỗ Hải Yến' })
      : row(c, 'Đỗ Hải Yến');
  await yen.getByText('Ghi nhận đã thu', { exact: true }).click();
  await expect(yen.getByText('Đang hiệu lực', { exact: true })).toBeVisible();
  await c.page.locator('[data-m="me"]').filter({ visible: true }).first().click();
  await tap(c, 'Đăng xuất');
  if (c.side === 'app') await c.page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await c.page
    .locator('input[type=email], input[placeholder="Nhập email hoặc số điện thoại"]')
    .filter({ visible: true })
    .first()
    .fill(ACCOUNTS.user.email);
  await c.page.locator('input[type=password]').fill(ACCOUNTS.user.pwd);
  await c.page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await waitText(c, 'Cộng đồng');
}

/** Additional matched-data control: D-109 restoration, not a replacement for default captures. */
export const PROJECT_RENEWAL: Scenario[] = PORTAL_PROJECTS.filter((s) =>
  ['P-55', 'P-56', 'P-57', 'P-59'].includes(s.id),
).map((s) => ({
  ...s,
  id: `${s.id}-RENEWED`,
  name: `${s.name} · sau khi Admin ghi nhận phí chủ p4`,
  start: 'admin',
  note: 'Additional full-screen comparison after identical fee-activation UI actions. Default D-109 screenshots remain unchanged.',
  steps: async (c) => {
    await renewOwner(c);
    await s.steps?.(c);
  },
}));
