import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';

test.use({ affiliateDemo: true });

for (const width of [1440, 390]) {
  test(`REQ-617 D-119 default AF0 history, ledger pagination and reload at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
    await page
      .locator('input[autocomplete=username], input[type=email]')
      .fill('admin@opchub.community');
    await page.locator('input[type=password]').fill('Admin@2026');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(/\/overview$/);
    await page.goto(`${ADMIN_URL}/affiliate?tab=gdv`, { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('status', {
        name: 'Doanh thu Media Soft giữ lại (sau phần GĐ Vùng)',
        exact: true,
      }),
    ).toContainText('55.920.000đ');
    await expect(page.getByText('Tổng phần GĐ Vùng', { exact: true }).locator('..')).toContainText(
      '44.880.000đ',
    );
    await expect(page.getByText('50 khoản từ 6 affiliate', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'GĐ Vùng đã thu hồi', exact: true })).toHaveCount(
      0,
    );
    const directorHeading = await page
      .getByRole('columnheader', { name: 'GĐ Vùng', exact: true })
      .boundingBox();
    expect(directorHeading).not.toBeNull();
    expect(directorHeading!.height).toBeCloseTo(55, 0);
    await page.getByRole('button', { name: /Trần Quốc Bảo/ }).click();
    const ledger = page.getByRole('region', { name: 'Khoản ghi nhận cho GĐ Vùng', exact: true });
    await expect(ledger.getByRole('row')).toHaveCount(9);
    const first = ledger.getByRole('row').filter({ hasText: 'Đỗ Minh Tuấn' });
    await expect(first).toContainText('40% · Năm 2');
    await expect(first).toContainText('1.440.000đ');
    const table = ledger.getByRole('table');
    await expect(table).toHaveCSS('table-layout', 'fixed');
    const date = ledger.getByRole('columnheader', { name: 'Ngày', exact: true });
    const customer = ledger.getByRole('columnheader', { name: 'Thành viên', exact: true });
    const [tableBox, dateBox, customerBox] = await Promise.all(
      [table, date, customer].map((column) => column.boundingBox()),
    );
    expect(tableBox).not.toBeNull();
    expect(tableBox!.width).toBeLessThan(width === 390 ? 900 : 1100);
    expect(dateBox).not.toBeNull();
    expect(customerBox).not.toBeNull();
    expect(dateBox!.width).toBeCloseTo(90, 0);
    expect(customerBox!.width).toBeCloseTo(((tableBox!.width - 90) * 12) / 65, 0);
    await expect(first.getByRole('cell').first()).toHaveCSS('vertical-align', 'top');
    await expect(first.getByRole('cell').first()).toHaveCSS('white-space', 'normal');
    const rowBoxes = await ledger.getByRole('row').evaluateAll((rows) =>
      rows.map((row) => ({
        top: row.getBoundingClientRect().top,
        bottom: row.getBoundingClientRect().bottom,
      })),
    );
    for (let i = 1; i < rowBoxes.length; i++) {
      expect(rowBoxes[i]!.top - rowBoxes[i - 1]!.bottom).toBeCloseTo(6, 0);
    }
    const history = page.getByRole('region', { name: 'Lịch sử chi trả', exact: true });
    await expect(history).toContainText('Tháng 09/2026');
    await expect(history).toContainText('20.880.000đ');
    await expect(history).toContainText('Tháng 08/2026');
    await expect(history).toContainText('7.800.000đ');
    await expect(history).toContainText('TRAN QUOC BAO · Vietcombank · 001100104567');
    const latest = history.getByText('20.880.000đ', { exact: true }).locator('..');
    const bank = latest.getByText('TRAN QUOC BAO · Vietcombank · 001100104567', { exact: true });
    const period = latest.getByText(/Tháng 09\/2026/);
    await bank.scrollIntoViewIfNeeded();
    await expect(bank).toBeInViewport();
    const [bankBox, periodBox] = await Promise.all([bank.boundingBox(), period.boundingBox()]);
    expect(bankBox).not.toBeNull();
    expect(periodBox).not.toBeNull();
    expect(Math.abs(bankBox!.y - periodBox!.y)).toBeLessThan(3);
    const more = ledger.getByRole('button', { name: '+ 41 khoản khác', exact: true });
    await more.focus();
    await more.press('Enter');
    await expect(ledger.getByRole('row')).toHaveCount(17);
    await expect(
      ledger.getByRole('button', { name: '+ 33 khoản khác', exact: true }),
    ).toBeVisible();
    await expect(
      ledger.getByRole('button', { name: '+ 33 khoản khác', exact: true }),
    ).toHaveAttribute('aria-busy', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Trần Quốc Bảo/ }).click();
    await expect(ledger.getByRole('row')).toHaveCount(9);
    await expect(
      ledger.getByRole('button', { name: '+ 41 khoản khác', exact: true }),
    ).toBeVisible();
    await expect(history.getByText('20.880.000đ', { exact: true })).toHaveCount(1);
    await expect(history.getByText('7.800.000đ', { exact: true })).toHaveCount(1);
  });
}
