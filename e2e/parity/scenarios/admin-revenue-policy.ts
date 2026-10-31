import { expect } from '@playwright/test';
import { affiliateTab, openAffiliate } from './admin-affiliate-steps';
import { resetScroll } from '../steps';
import type { Scenario } from '../types';

export const ADMIN_REVENUE_POLICY: Scenario[] = [
  {
    id: 'D-V46-POL-EDIT',
    name: 'Chính sách · bảng chia sẻ với tỷ lệ 55/10/25',
    demo: 'affiliate',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await openAffiliate(c);
      await affiliateTab(c, 'Chính sách');
      for (const [name, value] of [
        ['GĐ Vùng năm 1', '55'],
        ['Mức duy trì tối thiểu (chi phí vận hành)', '25'],
      ] as const) {
        const input =
          c.side === 'app'
            ? c.page.getByRole('spinbutton', { name, exact: true })
            : c.page.locator('label').filter({ hasText: name }).locator('input');
        await input.fill(value);
        await input.press('Tab');
        await expect(input).toHaveValue(value);
      }
      // A valid four-year schedule, with fixture prices, reached only by public inputs.
      await c.page.getByText('660.000đ', { exact: true }).first().waitFor();
      await c.page.getByText('300.000đ', { exact: true }).first().waitFor();
      await resetScroll(c);
    },
  },
];
