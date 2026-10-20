import { resetScroll, tick, type } from '../steps';
import type { Scenario } from '../types';
import { affiliateDetail, affiliateTab, openAffiliate } from './admin-affiliate-steps';

/** Each state is measured independently; filtered coverage never replaces the default list. */
export const ADMIN_AFFILIATE_STATES: Scenario[] = [
  {
    id: 'D-84-AFF',
    name: 'Admin · Affiliate · Đại lý mặc định',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await openAffiliate(c);
      await affiliateTab(c, 'Affiliate');
      await resetScroll(c);
    },
  },
  {
    id: 'D-84-AFF-Q',
    name: 'Admin · Affiliate · Tìm đại lý HAOPC',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await openAffiliate(c);
      await affiliateTab(c, 'Affiliate');
      await type(c, 'Tìm tên, mã giới thiệu, email...', 'HAOPC');
      await tick(c, 1000);
      await c.page.waitForLoadState('networkidle');
      await resetScroll(c);
    },
  },
  {
    id: 'D-84-POL',
    name: 'Admin · Affiliate · Chính sách',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await openAffiliate(c);
      await affiliateTab(c, 'Chính sách');
      await resetScroll(c);
    },
  },
  {
    id: 'D-85-CUS',
    name: 'Admin · Affiliate · Khách hàng của đại lý',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await affiliateDetail(c);
      const tab =
        c.side === 'app'
          ? c.page.getByRole('tab', { name: /^Khách hàng của đại lý/ })
          : c.page.getByText('Khách hàng của đại lý', { exact: true }).filter({ visible: true });
      await tab.click();
      await tick(c, 1000);
      await c.page.waitForLoadState('networkidle');
      await resetScroll(c);
    },
  },
  {
    id: 'D-85-RATE',
    name: 'Admin · Affiliate · Sửa tỷ lệ cá nhân',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await affiliateDetail(c);
      const edit =
        c.side === 'app'
          ? c.page.getByRole('button', { name: 'Sửa (Admin)', exact: true })
          : c.page.getByText('Sửa (Admin)', { exact: true }).filter({ visible: true });
      await edit.click();
      await tick(c, 500);
      if (c.side === 'app')
        await c.page
          .getByRole('form', { name: 'Đặt tỷ lệ hoa hồng', exact: true })
          .waitFor({ state: 'visible' });
      else
        await c.page
          .getByRole('button', { name: 'Lưu', exact: true })
          .waitFor({ state: 'visible' });
      await c.page.waitForLoadState('networkidle');
      await resetScroll(c);
    },
  },
];
