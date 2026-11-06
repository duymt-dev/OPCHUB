import { test, expect, type Page } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';

async function open(page: Page, email = 'admin@opchub.community') {
  await signInAffiliate(page, ADMIN_URL, email, 'Admin@2026');
  await page.getByRole('tab', { name: 'Cấu hình GĐ Vùng', exact: true }).click();
  await expect(page.getByText('Cấu hình Giám đốc Vùng', { exact: true })).toBeVisible();
}

test.describe('TIP-V46-801 regional directors', () => {
  test('AT-GDV01 demo slots, fee exemption and province coverage', async ({ page }) => {
    await open(page);
    for (const name of ['Trần Quốc Bảo', 'Lê Minh Hải', 'Phạm Thu Hà']) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText('Tất cả 34 tỉnh/thành đã có GĐ Vùng phụ trách')).toBeVisible();
    await page.getByRole('button', { name: '+ Bổ nhiệm GĐ Vùng', exact: true }).click();
    await expect(page.getByText(/Đã đủ 3 vùng Bắc/)).toBeVisible();
    await page.goto(`${ADMIN_URL}/fees?status=gdv`);
    const rows = page.locator('[data-m="tbl"]').getByRole('row');
    await expect(rows).toHaveCount(4);
    await expect(
      rows.getByRole('button', { name: /Ghi nhận đã thu|Gia hạn 12 tháng|Gửi nhắc/ }),
    ).toHaveCount(0);
  });

  test('AT-GDV02 AT-GDV07 revocation requires confirmation and adds history', async ({ page }) => {
    await open(page);
    const slot = page.locator('#regional-south');
    await slot.getByRole('button', { name: 'Thu hồi', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAccessibleName('Thu hồi GĐ Vùng?');
    await dialog.getByRole('button', { name: /OK|Đồng ý|Xác nhận/ }).click();
    await expect(slot.getByText('Chưa bổ nhiệm', { exact: true })).toBeVisible();
    await expect(page.getByText('Lịch sử bổ nhiệm / thu hồi')).toBeVisible();
    await expect(page.getByText('Phạm Thu Hà · Miền Nam', { exact: true })).toBeVisible();
  });

  test('AT-GDV03 accountant can view but cannot change slots or bank data', async ({ page }) => {
    await open(page, 'mai.hoang@opchub.community');
    await expect(page.getByText(/Vai trò Kế toán chỉ được xem/)).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Bổ nhiệm GĐ Vùng', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole('button', { name: 'Thu hồi', exact: true })).toHaveCount(0);
    for (const region of ['north', 'central', 'south']) {
      const slot = page.locator(`#regional-${region}`);
      await expect(slot.getByRole('combobox')).toBeDisabled();
      for (const input of await slot.getByRole('textbox').all()) await expect(input).toBeDisabled();
    }
  });

  test('AT-GDV05 AT-GDV06 candidates omit other occupants and locked members', async ({ page }) => {
    await open(page);
    const select = page.locator('#regional-south').getByRole('combobox');
    await select.click();
    await select.fill('Trần Quốc Bảo');
    await expect(page.getByRole('option', { name: /Trần Quốc Bảo/ })).toHaveCount(0);
    await select.fill('Ngô Thành Đạt');
    await expect(page.getByRole('option', { name: /Ngô Thành Đạt/ })).toHaveCount(0);
    await select.fill('Nguyễn Văn An');
    await expect(page.getByRole('option', { name: /Nguyễn Văn An/ })).toBeVisible();
  });

  test('D-129 toggling coverage preserves affiliate count and can be restored', async ({
    page,
  }) => {
    await open(page);
    const slot = page.locator('#regional-north');
    const count = await slot.getByText(/^\d+ affiliate$/).textContent();
    const chip = slot.getByRole('button', { name: 'Hà Nội', exact: true });
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText(/^1 tỉnh chưa có GĐ Vùng phụ trách/)).toBeVisible();
    await expect(slot.getByText(/^\d+ affiliate$/)).toHaveText(count ?? '');
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
  });
});
