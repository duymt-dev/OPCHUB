import { test, expect } from '../server/test';
import { ADMIN_URL } from '../urls';
import { signInAffiliate, openAffiliateDetail } from './helpers/affiliate-session';

test.use({ affiliateDemo: true });

test('REQ-308 REQ-312 individual rate is inline, cancel/F5 keeps its rate and save persists', async ({
  page,
}) => {
  await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  await openAffiliateDetail(page, 'HAOPC', 'Lê Thu Hà');
  await page.getByRole('button', { name: 'Sửa (Admin)', exact: true }).click();
  const editor = page.getByRole('form', { name: 'Đặt tỷ lệ hoa hồng', exact: true });
  const input = editor.getByRole('spinbutton', { name: 'Tỷ lệ hoa hồng (%)', exact: true });
  await expect(editor).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(input).toHaveValue('25');
  await input.fill('31');
  await editor.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('25%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sửa (Admin)', exact: true }).click();
  await input.fill('');
  await expect(editor.getByRole('button', { name: 'Lưu', exact: true })).toBeDisabled();
  await input.fill('31');
  const saved = page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && /\/admin\/affiliates\/[^/]+$/.test(r.url()),
  );
  await editor.getByRole('button', { name: 'Lưu', exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(editor).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('31%', { exact: true })).toBeVisible();
});
