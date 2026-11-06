import { nav, tick } from '../steps';
import type { Scenario } from '../types';

export const GLOBAL_SEARCH: Scenario[] = [
  {
    id: 'P-V46-SEARCH',
    name: 'Topbar · global search',
    start: 'user',
    steps: async (c) => {
      if (c.vw <= 1023) return;
      const input =
        c.side === 'proto'
          ? c.page.locator('[data-m="search"] input')
          : c.page.getByRole('combobox', { name: /^Tìm gian hàng/ });
      const response =
        c.side === 'app'
          ? c.page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/search'))
          : undefined;
      await input.fill('cà phê');
      await tick(c, 300);
      if (response) await response;
      await tick(c, 50);
      if (c.side === 'app') await c.page.getByRole('listbox').waitFor({ state: 'visible' });
    },
  },
  {
    id: 'D-V46-SEARCH',
    name: 'Topbar · global search Admin',
    start: 'admin',
    appPath: '/members',
    steps: async (c) => {
      await nav(c, 'Thành viên');
      if (c.vw <= 1023) return;
      const input =
        c.side === 'proto'
          ? c.page.locator('[data-m="search"] input')
          : c.page.getByRole('combobox', { name: /^Tìm thành viên/ });
      const response =
        c.side === 'app'
          ? c.page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/search'))
          : undefined;
      await input.fill('MediaSoft');
      await tick(c, 300);
      if (response) await response;
      await tick(c, 50);
      const item =
        c.side === 'proto'
          ? c.page
              .locator('[data-m="search"]')
              .getByText('Công ty TNHH Giải pháp MediaSoft', { exact: true })
          : c.page.getByRole('option').first();
      await item.waitFor({ state: 'visible' });
    },
  },
];
