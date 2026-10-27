import { expect, test, type Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';

test.use({ viewport: { width: 390, height: 844 } });

async function login(page: Page, origin: string, email: string, password: string) {
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[autocomplete=username], input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

async function noHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth - root.clientWidth;
      }),
    )
    .toBeLessThanOrEqual(0);
}

test('UAT-31 Portal Dashboard and community fit390px with a working mobile navigation drawer', async ({
  page,
}) => {
  await login(page, PORTAL_URL, 'an.nguyen@mediasoft.vn', 'User@2026');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Hướng dẫn bắt đầu', { exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
  const drawer = page.locator('aside');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(drawer).toHaveAttribute('data-open', 'true');
  await noHorizontalOverflow(page);
  await drawer.getByText('Cộng đồng', { exact: true }).click();
  await expect(page).toHaveURL(/\/community$/);
  await expect(drawer).toHaveAttribute('data-open', 'false');
  await noHorizontalOverflow(page);
});

test('UAT-31 Admin Members rows become bounded selectable cards at390px and return to desktop columns', async ({
  page,
}) => {
  await login(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await page.goto(`${ADMIN_URL}/members?view=list`, { waitUntil: 'networkidle' });
  await expect(page.getByPlaceholder('Tìm theo tên, email...')).toBeVisible();
  const selection = page.getByRole('checkbox', { name: 'Chọn Lê Minh Anh', exact: true });
  const row = page.locator('[data-m="tbl"] > div > div').filter({ has: selection });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole('button', { name: /^Lê Minh Anh/ })).toBeVisible();
  await expect(row).toHaveCSS('display', 'flex');
  await expect(row).toHaveCSS('flex-wrap', 'wrap');
  await noHorizontalOverflow(page);
  const cards = await page.locator('[data-m="tbl"]').evaluate((table) =>
    Array.from(table.querySelectorAll<HTMLElement>(':scope > div > div'))
      .slice(1)
      .map((card) => {
        const bounds = card.getBoundingClientRect();
        const cells = Array.from(card.children).map((cell) => cell.getBoundingClientRect());
        return {
          width: bounds.width,
          left: bounds.left,
          right: bounds.right,
          count: cells.length,
          allCellsFit: cells.every(
            (cell) => cell.left >= bounds.left && cell.right <= bounds.right,
          ),
          wrapped: new Set(cells.map((cell) => Math.round(cell.top))).size > 1,
        };
      }),
  );
  expect(cards.length).toBeGreaterThan(1);
  for (const card of cards) {
    expect(card.width).toBeGreaterThan(0);
    expect(card.left).toBeGreaterThanOrEqual(0);
    expect(card.right).toBeLessThanOrEqual(390);
    // 9 ô: chọn, thành viên, loại, nhóm, vai trò, ngày, Bắt đầu (V4-611 D-86), trạng thái, thao tác
    expect(card.count).toBe(9);
    expect(card.allCellsFit).toBe(true);
    expect(card.wrapped).toBe(true);
  }
  await selection.click();
  await expect(selection).toBeChecked();
  await expect(
    page
      .getByRole('region', { name: 'Thao tác hàng loạt' })
      .getByText('Đã chọn 1 mục', { exact: true }),
  ).toBeVisible();
  await noHorizontalOverflow(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(row).toHaveCSS('display', 'grid');
  await expect(selection).toBeChecked();
  await noHorizontalOverflow(page);
});
