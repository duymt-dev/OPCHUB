import { expect } from '@playwright/test';
import { resetScroll, tick, type } from '../steps';
import type { Scenario, StepCtx } from '../types';
import { affiliateTab, openAffiliate } from './admin-affiliate-steps';

function rows(c: StepCtx, kind: 'com' | 'aff') {
  return c.side === 'app'
    ? c.page.locator('tbody tr[data-row-key]')
    : c.page
        .locator(`[data-m="tbl"] div[style*="min-height: ${kind === 'com' ? 52 : 60}px"]`)
        .filter({ visible: true });
}

async function filtered(c: StepCtx, kind: 'com' | 'aff', query: string) {
  await openAffiliate(c);
  if (kind === 'aff') await affiliateTab(c, 'Affiliate');
  // Positive control: an invalid selector must not make an empty-result check pass.
  await expect(rows(c, kind).first()).toBeVisible();
  await type(
    c,
    kind === 'com' ? 'Tìm thành viên hoặc affiliate...' : 'Tìm tên, mã giới thiệu, email...',
    query,
  );
  await tick(c, 1000);
  await c.page.waitForLoadState('networkidle');
}

async function select(c: StepCtx, kind: 'com' | 'aff', text: string) {
  const candidates = rows(c, kind).filter({ hasText: text });
  const row =
    kind === 'aff'
      ? candidates.filter({ has: c.page.getByText(text, { exact: true }) })
      : c.side === 'app'
        ? candidates.filter({ hasText: '20% · Năm 1' })
        : candidates;
  await expect(row).toHaveCount(1);
  if (c.side === 'app') await row.getByRole('checkbox').check();
  else await row.locator(':scope > div').first().click();
}

export const ADMIN_AFFILIATE_LIST_STATES: Scenario[] = [
  {
    id: 'D-84-COM-BULK',
    name: 'Admin · Affiliate · Chọn hai khoản hoa hồng',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await filtered(c, 'com', 'Nguyễn Văn An');
      if (c.side === 'app') {
        await c.page.getByRole('combobox', { name: 'Số dòng mỗi trang' }).selectOption('20');
      }
      await expect(rows(c, 'com')).toHaveCount(c.side === 'app' ? 11 : 9);
      await select(c, 'com', 'Đỗ Minh Tuấn');
      await select(c, 'com', 'Đặng Ngọc Ánh');
      await expect(c.page.getByText(/^Đã chọn\s+2(?:\s+mục)?\s*$/)).toBeVisible();
      await resetScroll(c);
    },
  },
  {
    id: 'D-84-AFF-BULK',
    name: 'Admin · Affiliate · Chọn đại lý HAOPC',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await filtered(c, 'aff', 'HAOPC');
      await select(c, 'aff', 'HAOPC');
      await expect(c.page.getByText(/^Đã chọn\s+1(?:\s+mục)?\s*$/)).toBeVisible();
      await resetScroll(c);
    },
  },
  ...(['com', 'aff'] as const).map((kind): Scenario => ({
    id: `D-84-${kind === 'com' ? 'COM' : 'AFF'}-EMPTY`,
    name: `Admin · Affiliate · ${kind === 'com' ? 'Hoa hồng' : 'Đại lý'} không có kết quả`,
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await filtered(c, kind, 'ZZZ_NO_AFFILIATE_MATCH_2026');
      await expect(rows(c, kind)).toHaveCount(0);
      await resetScroll(c);
    },
  })),
];
