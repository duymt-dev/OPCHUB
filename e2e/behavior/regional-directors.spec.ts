import { test, expect, type Page } from '../server/test';
import { onServer } from '../server/api';
import { lastMailTo, linkFrom } from '../server/mailbox';
import { ADMIN_URL, PORTAL_URL } from '../urls';

async function openConfig(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
  await page
    .locator('input[autocomplete=username], input[type=email]')
    .fill('admin@opchub.community');
  await page.locator('input[type=password]').fill('Admin@2026');
  const loggedIn = page.waitForResponse((r) => r.url().endsWith('/admin/auth/login'));
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  expect((await loggedIn).status()).toBe(200);
  await page.waitForURL(/\/overview$/);
  await page.goto(`${ADMIN_URL}/affiliate?tab=gcfg`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('article')).toHaveCount(3);
}

const north = (page: Page) => page.getByRole('article', { name: 'Miền Bắc', exact: true });

async function revoke(page: Page, name: string) {
  await north(page).getByRole('button', { name: 'Thu hồi', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: `Thu hồi GĐ Vùng ${name}?` });
  await expect(dialog).toContainText('Giữ nguyên hạn phí trước bổ nhiệm');
  await dialog.getByRole('button', { name: 'Thu hồi', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(north(page)).toContainText('Chưa có GĐ Vùng');
}

/** Same destination assertions; only mailbox fixture acquisition differs, as in auth-flows. */
async function loginLink(email: string, since: number) {
  if (!onServer) return `${PORTAL_URL}/login`;
  return linkFrom(await lastMailTo(email, { since }), '/login');
}

test('REQ-616 AT-GDV01/02/07 BR-464 appointment/revocation persist, exclude paid fees and mail links open login', async ({
  page,
  context,
}) => {
  await openConfig(page);
  await expect(north(page)).toContainText('Trần Quốc Bảo');
  await expect(north(page).getByRole('textbox', { name: 'Số tài khoản' })).toHaveValue(
    '001100104567',
  );
  await revoke(page, 'Trần Quốc Bảo');
  await page.getByRole('button', { name: '+ Bổ nhiệm GĐ Vùng', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: '+ Bổ nhiệm GĐ Vùng', exact: true });
  const search = dialog.getByRole('combobox', { name: 'Thành viên phụ trách' });
  await search.fill('an.nguyen@mediasoft.vn');
  // AntD's virtual list exposes a hidden ARIA option; select through the real keyboard control.
  await expect(
    page.getByRole('option', { name: /Nguyễn Văn An · an.nguyen@mediasoft.vn/ }),
  ).toHaveCount(1);
  await search.press('ArrowDown');
  await search.press('Enter');
  const appointedAt = Date.now();
  await dialog.getByRole('button', { name: '+ Bổ nhiệm GĐ Vùng', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(north(page)).toContainText('Nguyễn Văn An');
  await expect(north(page)).toContainText('Miễn phí thành viên trong thời gian làm GĐ Vùng');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(north(page)).toContainText('Nguyễn Văn An');
  await expect(north(page).getByRole('textbox', { name: 'Số tài khoản' })).toHaveValue(
    '001100104567',
  );
  await expect(
    page.getByText('Bổ nhiệm GĐ Vùng Miền Bắc · Nguyễn Văn An', { exact: true }),
  ).toBeVisible();

  const link = await loginLink('an.nguyen@mediasoft.vn', appointedAt);
  expect(link).toBe(`${PORTAL_URL}/login`);
  const recipient = await context.newPage();
  await recipient.goto(link, { waitUntil: 'networkidle' });
  await expect(recipient).toHaveURL(`${PORTAL_URL}/login`);
  await expect(recipient.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();

  await page.goto(`${ADMIN_URL}/fees?status=gdv`, { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('radio', { name: 'Miễn phí · GĐ Vùng 3', exact: true }),
  ).toHaveAttribute('aria-checked', 'true');
  const row = page.getByRole('row').filter({ hasText: 'an.nguyen@mediasoft.vn' });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Miễn phí · GĐ Vùng');
  await expect(row.getByRole('button', { name: /Ghi nhận đã thu|Gia hạn|Gửi nhắc/ })).toHaveCount(
    0,
  );

  await page.goto(`${ADMIN_URL}/affiliate?tab=gcfg`, { waitUntil: 'networkidle' });
  const revokedAt = Date.now();
  await revoke(page, 'Nguyễn Văn An');
  await expect(page.getByRole('article')).toHaveCount(3);
  const revokedLink = await loginLink('an.nguyen@mediasoft.vn', revokedAt);
  expect(revokedLink).toBe(`${PORTAL_URL}/login`);
  await recipient.goto(revokedLink, { waitUntil: 'networkidle' });
  await expect(recipient).toHaveURL(`${PORTAL_URL}/login`);
  await expect(recipient.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(north(page)).toContainText('Chưa có GĐ Vùng');
  await expect(north(page).getByRole('textbox', { name: 'Số tài khoản' })).toHaveValue(
    '001100104567',
  );
  await expect(
    page.getByText('Thu hồi GĐ Vùng Miền Bắc · Nguyễn Văn An', { exact: true }),
  ).toBeVisible();
});
