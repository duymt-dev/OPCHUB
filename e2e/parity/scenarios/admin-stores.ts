import { nav, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

/** Admin D-93 → D-94: Gian hàng (V4-608, AD-07) */

/** Prototype v4 hiện mục "Gian hàng" (mã menu `stores`) ngay trong nhóm KẾT NỐI KINH DOANH */
const toStores = async (c: StepCtx) => {
  await nav(c, 'Gian hàng');
  await waitText(c, 'SP/DV');
};

export const ADMIN_STORES: Scenario[] = [
  {
    id: 'D-93',
    name: 'Admin › Gian hàng (KPI, chip, bảng)',
    start: 'admin',
    fullPage: true,
    steps: toStores,
  },
  {
    id: 'D-94',
    name: 'Admin › Gian hàng · panel chi tiết',
    start: 'admin',
    capture: {
      selector: (c) =>
        c.side === 'app'
          ? c.page.getByRole('dialog').first()
          : c.page
              .locator('div')
              .filter({ has: c.page.getByText('Chi tiết gian hàng', { exact: true }) })
              .filter({ has: c.page.getByText('Ẩn gian hàng', { exact: true }) })
              .last(),
      reason: 'Panel chi tiết (màn TIP); bảng phía sau đo ở D-93',
    },
    steps: async (c) => {
      await toStores(c);
      // cùng một gian hàng hai bên (thứ tự bảng khác: DV-V4-608-3)
      await c.page
        .getByText('Công ty TNHH Giải pháp MediaSoft', { exact: true })
        .filter({ visible: true })
        .first()
        .click();
      await waitText(c, 'Chi tiết gian hàng');
    },
  },
];
