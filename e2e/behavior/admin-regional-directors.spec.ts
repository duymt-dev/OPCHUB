import { test, expect, type Page } from '../server/test';
import { ADMIN_URL, PORTAL_URL } from '../urls';
import { signInAffiliate } from './helpers/affiliate-session';
import { meSchema } from '@opchub/shared/api';

async function open(page: Page, email = 'admin@opchub.community') {
  await signInAffiliate(page, ADMIN_URL, email, 'Admin@2026');
  await page.getByRole('tab', { name: 'Cấu hình GĐ Vùng', exact: true }).click();
  await expect(page.getByText('Cấu hình Giám đốc Vùng', { exact: true })).toBeVisible();
}

test.describe('TIP-V46-801 regional directors', () => {
  test('TC-462 remaining paid fee stays usable and bell notification states expiry', async ({
    page,
    context,
  }) => {
    await open(page);
    const slot = page.locator('#regional-north');
    // Establish a currently paid member through the real appointment flow; the
    // prototype director's fixed October deadline is no longer a valid-fee fixture.
    const candidate = slot.getByRole('combobox');
    await candidate.click();
    await candidate.fill('Nguyễn Văn An');
    await page.getByRole('option', { name: /Nguyễn Văn An/ }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /OK|Đồng ý|Xác nhận/ })
      .click();
    await expect(slot.getByText('Nguyễn Văn An', { exact: true })).toBeVisible();
    await slot.getByRole('button', { name: 'Thu hồi', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /OK|Đồng ý|Xác nhận/ })
      .click();
    await expect(slot.getByText('Chưa bổ nhiệm', { exact: true })).toBeVisible();
    const portal = await context.newPage();
    await portal.goto(`${PORTAL_URL}/login`);
    await portal
      .locator('input[autocomplete=username], input[type=email]')
      .fill('an.nguyen@mediasoft.vn');
    await portal.locator('input[type=password]').fill('User@2026');
    const loggedIn = portal.waitForResponse((r) => new URL(r.url()).pathname === '/v1/auth/login');
    await portal.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    const response: unknown = await (await loggedIn).json();
    const me = meSchema.parse((response as { me: unknown }).me);
    expect(me.membershipFee?.status).toMatch(/^(active|expiring)$/);
    const expiry = me.membershipFee?.validUntil;
    expect(expiry).toBeTruthy();
    const date = new Date(expiry ?? '').toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    await expect(portal).not.toHaveURL(/\/login$/);
    await expect(portal.getByRole('dialog', { name: 'Gói dịch vụ', exact: true })).toHaveCount(0);
    await portal.getByRole('button', { name: 'Thông báo', exact: true }).click();
    await expect(
      portal.getByText('Kết thúc vai trò GĐ Vùng Miền Bắc', { exact: true }),
    ).toBeVisible();
    await expect(
      portal.getByText(
        `Phí thành viên cũ còn hiệu lực đến ${date}. Chia sẻ đã ghi nhận vẫn được chi.`,
        { exact: true },
      ),
    ).toBeVisible();
    await portal.goto(`${PORTAL_URL}/community`);
    await expect(portal.getByText('Khám phá cộng đồng', { exact: true })).toBeVisible();
    await expect(portal.getByRole('dialog', { name: 'Gói dịch vụ', exact: true })).toHaveCount(0);
    await portal.goto(`${PORTAL_URL}/affiliate?tab=reg`);
    await expect(portal.getByRole('tab', { name: /Vùng của tôi/ })).toHaveCount(0);
  });
  test('AT-GDV02 expired previous fee requires non-dismissible popup after Portal login', async ({
    page,
    context,
  }) => {
    await open(page);
    const slot = page.locator('#regional-south');
    const select = slot.getByRole('combobox');
    await select.click();
    await select.fill('Đỗ Hải Yến');
    await page.getByRole('option', { name: /Đỗ Hải Yến/ }).click();
    const replacement = page.getByRole('dialog');
    await replacement.getByRole('button', { name: /OK|Đồng ý|Xác nhận/ }).click();
    await expect(slot.getByText('Đỗ Hải Yến', { exact: true })).toBeVisible();
    await slot.getByRole('button', { name: 'Thu hồi', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /OK|Đồng ý|Xác nhận/ })
      .click();
    await expect(slot.getByText('Chưa bổ nhiệm', { exact: true })).toBeVisible();
    const portal = await context.newPage();
    await portal.goto(`${PORTAL_URL}/login`);
    await portal
      .locator('input[autocomplete=username], input[type=email]')
      .fill('do.haiyen@opchub.vn');
    await portal.locator('input[type=password]').fill('User@2026');
    await portal.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(portal).not.toHaveURL(/\/login$/);
    const gate = portal.getByRole('dialog', { name: 'Gói dịch vụ', exact: true });
    await expect(gate).toBeVisible();
    await expect(gate.getByRole('button', { name: 'Đóng', exact: true })).toHaveCount(0);
    await portal.keyboard.press('Escape');
    await expect(gate).toBeVisible();
    await portal.goto(`${PORTAL_URL}/affiliate?tab=reg`);
    // Affiliate itself is the existing permitted unpaid route (overlay-policy.ts).
    await expect(
      portal.getByRole('heading', { name: 'Mạng lưới Affiliate', exact: true }),
    ).toBeVisible();
    await expect(portal.getByRole('tab', { name: /Vùng của tôi/ })).toHaveCount(0);
  });
  test('AT-GDV01 demo slots, fee exemption and province coverage', async ({ page }) => {
    await open(page);
    for (const name of ['Trần Quốc Bảo', 'Lê Minh Hải', 'Phạm Thu Hà']) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText('Tất cả 34 tỉnh/thành đã có GĐ Vùng phụ trách')).toBeVisible();
    const bankControl = page.locator('#regional-north .ant-form-item-control-input').first();
    expect((await bankControl.boundingBox())?.height).toBe(34);
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
