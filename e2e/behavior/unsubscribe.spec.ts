import { expect, test } from '../server/test';
import { unsubscribeToken } from '../server/unsubscribe-token';
import { PORTAL_URL } from '../urls';

/** BUG-036 (NĐ 13/2023): trang công khai huỷ nhận email chiến dịch — không cần đăng nhập */

const INVALID = 'Liên kết huỷ đăng ký không hợp lệ';

test.describe('Huỷ đăng ký nhận email (BUG-036)', () => {
  test('BUG-036 trang huỷ đăng ký công khai', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const token = unsubscribeToken('an.nguyen@mediasoft.vn');
    await page.goto(`${PORTAL_URL}/unsubscribe?token=${token}`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/unsubscribe\?token=/);
    await expect(page.getByRole('heading', { name: 'Huỷ đăng ký nhận email' })).toBeVisible();
    await expect(page.getByText('an***@mediasoft.vn', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Xác nhận huỷ đăng ký' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Bạn sẽ' })).toHaveText(
      'Bạn sẽ không nhận email chiến dịch từ OPC Hub nữa',
    );
    await expect(page.getByRole('button', { name: 'Xác nhận huỷ đăng ký' })).toHaveCount(0);

    // Mở lại link đã dùng: vẫn hợp lệ, xác nhận lại không lỗi (idempotent)
    await page.goto(`${PORTAL_URL}/unsubscribe?token=${token}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Xác nhận huỷ đăng ký' }).click();
    await expect(page.getByText('Bạn sẽ không nhận email chiến dịch từ OPC Hub nữa')).toBeVisible();
  });

  test('BUG-036 link bị sửa / thiếu token → báo không hợp lệ', async ({ page }) => {
    const token = unsubscribeToken('an.nguyen@mediasoft.vn');
    const bad = `${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`;
    await page.goto(`${PORTAL_URL}/unsubscribe?token=${bad}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('alert').filter({ hasText: INVALID })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xác nhận huỷ đăng ký' })).toHaveCount(0);
    await page.goto(`${PORTAL_URL}/unsubscribe`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('alert').filter({ hasText: INVALID })).toBeVisible();
  });
});
